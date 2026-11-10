const app = document.querySelector("#app");
const choices = ["非常像我", "比较像我", "看情况 / 说不准", "不太像我", "很不像我"];
let answers = [];
let extra = [];

function scoresFor(values) {
  const scores = [0, 0, 0, 0];
  values.forEach((value, i) => { scores[i % 4] += value * questions[i][0]; });
  return scores;
}

function directionsFor(scores, ties) {
  return scores.map((score, i) => score === 0 ? ties[i] : score > 0 ? "A" : "B");
}

function render(content) {
  app.innerHTML = content;
  window.scrollTo(0, 0);
  app.querySelector("h1").focus({preventScroll: true});
}

function bind(id, handler) {
  document.getElementById(id).addEventListener("click", handler);
}

function cover(title, mode) {
  const original = mode === "original";
  return `<div class="cover ${mode}" aria-label="${title}">
    <img src="${mode === "home" ? "cover-home.jpg" : original ? "cover.jpg" : "cover-result.jpg"}" alt="">
    ${original ? "" : `<div class="book-title"><strong>${title}</strong>${mode === "home" ? "<small>16 种医学生学习画像</small>" : ""}</div>`}
    ${mode === "home" ? '<span class="imprint">医学生趣味测验</span><span class="edition">校园版</span><span class="duration">20 道题 · 约 3 分钟</span>' : ""}
  </div>`;
}

function home() {
  answers = [];
  extra = [];
  render(`<h1 class="sr" tabindex="-1">测测你是哪本蓝色生死恋</h1>
    ${cover("测测你是哪本<br>蓝色生死恋", "home")}
    <p class="intro">选最像你平时做法的一项。如果两种做法差不多常用，选「看情况 / 说不准」。</p>
    <button id="start" class="primary full">开始测试</button>
    <p class="foot">仅记录本浏览器首次完成的教材结果及随机去重编号。逐题答案留在本机。</p>`);
  bind("start", () => question(0));
}

function selection({meta, title, options, selected, previous, next, proceed, progress}) {
  render(`<section class="panel">
    <p class="eyebrow">${meta}</p>
    ${progress ?? ""}
    <h1 tabindex="-1">${title}</h1>
    <fieldset><legend class="sr">请选择一项</legend>
      ${options.map((label, i) => `<label class="choice"><input type="radio" name="answer" value="${i}" ${selected === i ? "checked" : ""}><span>${label}</span></label>`).join("")}
    </fieldset>
    <div class="actions"><button id="back">${previous}</button><button class="primary" id="next" ${selected == null ? "disabled" : ""}>${next}</button></div>
  </section>`);
  const nextButton = document.getElementById("next");
  let current = selected;
  app.querySelector("fieldset").addEventListener("change", event => {
    current = Number(event.target.value);
    nextButton.disabled = false;
  });
  bind("back", () => proceed(current, false));
  bind("next", () => proceed(current, true));
}

function question(i) {
  const last = i === questions.length - 1;
  selection({
    meta: `第 ${i + 1} 题 / 共 ${questions.length} 题`,
    title: questions[i][1],
    options: choices,
    selected: answers[i] == null ? undefined : 2 - answers[i],
    previous: i === 0 ? "返回封面" : "上一题",
    next: last ? "查看结果" : "下一题",
    progress: `<progress value="${i + 1}" max="${questions.length}" aria-label="答题进度"></progress>`,
    proceed(choice, forward) {
      if (choice != null) answers[i] = 2 - choice;
      if (!forward) {
        if (i > 0) question(i - 1);
        else home();
      } else if (last) {
        extra = [];
        const scores = scoresFor(answers);
        const zeros = [0, 1, 2, 3].filter(axis => scores[axis] === 0);
        if (zeros.length) tie(scores, zeros, 0);
        else result(scores);
      } else {
        question(i + 1);
      }
    }
  });
}

function tie(scores, zeros, step) {
  const axis = zeros[step];
  selection({
    meta: `补选 ${step + 1} / ${zeros.length}`,
    title: `${axes[axis][0]} · 如果只能选一种，你更倾向？`,
    options: axes[axis].slice(3),
    selected: undefined,
    previous: "返回修改答卷",
    next: step + 1 === zeros.length ? "查看结果" : "下一项",
    proceed(choice, forward) {
      if (!forward) {
        extra = [];
        question(questions.length - 1);
        return;
      }
      extra[axis] = choice === 0 ? "A" : "B";
      if (step + 1 < zeros.length) tie(scores, zeros, step + 1);
      else result(scores);
    }
  });
}

function analysisFor(scores, directions) {
  const ranked = [0, 1, 2, 3].sort((a, b) => Math.abs(scores[b]) - Math.abs(scores[a]));
  const [strongest, ...rest] = ranked;
  const strongestCopy = [
    ["你最有成就感的时候，是终于把一个原来讲不清的问题讲通。", "最让你有成就感的是学到的东西真的帮你做成了一件事。"],
    ["任务撞在一起时，你更愿意把整块时间留给最关键的难点。", "任务撞在一起时，你更愿意让几项都推进，再回头深挖。"],
    ["读陌生病例时，你习惯先把变化按过程串起来。", "读陌生病例时，你习惯先并排比较几种可能的解释。"],
    ["小组开工时，你喜欢先商量共同框架，再分头推进。", "小组开工时，你喜欢先让各自的思路成形，再一起取舍。"]
  ];
  const sentence = i => strongestCopy[i][directions[i] === "A" ? 0 : 1];
  const weakest = [...rest].sort((a, b) => Math.abs(scores[a]) - Math.abs(scores[b]) || a - b)[0];
  const [name, a, b] = axes[weakest];
  const preference = directions[weakest] === "A" ? a : b;
  const first = Math.abs(scores[strongest]) <= 2
    ? "这次作答的四项倾向都比较接近中间，这本书代表你略偏向的组合。"
    : sentence(strongest);
  const second = scores[weakest] === 0
    ? `${name}方面，作答接近中间，补选时你更倾向「${preference}」。`
    : Math.abs(scores[weakest]) <= 2
      ? `${name}方面，两种方式都用得上，这次略偏向「${preference}」。`
      : sentence(rest[0]);
  return first + second;
}

function result(scores) {
  const directions = directionsFor(scores, extra);
  const code = directions.join("");
  const [title, portrait, quote] = books[code];
  recordFirstResult(code);
  render(`<header class="result-head"><p class="eyebrow">你的蓝色教材</p><h1 tabindex="-1">你是《${title}》</h1></header>
    ${cover(title, title === "医学统计学" ? "original" : "matched")}
    <section class="panel details"><blockquote class="book-quote">「${quote}」</blockquote>
    <h2>你和这本书的相似之处</h2><p>${portrait}</p>
    <h2>你的答题里</h2><p>${analysisFor(scores, directions)}</p>
    ${scores.map((score, i) => `<div class="axis">
      <strong>${axes[i][0]}</strong>${Math.abs(score) <= 2 ? '<small>两边都用得上</small>' : ""}
      <div class="scale" role="meter" aria-label="${axes[i][0]}" aria-valuemin="-10" aria-valuemax="10" aria-valuenow="${score}" aria-valuetext="${score === 0 ? "居中" : "偏向" + axes[i][score > 0 ? 1 : 2]}"><i style="--position:${50 - 5 * score}%"></i></div>
      <div class="ends"><span>${axes[i][1]}</span><span>${axes[i][2]}</span></div>
    </div>`).join("")}</section>
    <button class="primary full" id="restart">再测一次</button><p class="foot">医学生学习方式趣味测验</p>`);
  bind("restart", home);
}

home();
