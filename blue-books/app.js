const app = document.querySelector("#app");
const maxAxisScore = 15;
const weakScore = 3;
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
    ${mode === "home" ? '<span class="imprint"><img src="cover-logos.png" alt=""><span>交医学联·小医生Joy</span></span><span class="edition">校园版</span><span class="duration">20 道题 · 约 3 分钟</span>' : ""}
  </div>`;
}

function home(reset = true) {
  if (reset) {
    answers = [];
    extra = [];
  }
  render(`<h1 class="sr" tabindex="-1">测测你是哪本蓝色生死恋</h1>
    ${cover("测测你是哪本<br>蓝色生死恋", "home")}
    <p class="intro">你知道吗？每本教材书都藏着一组不同的学习特质，快来测测你是哪本书吧！</p>
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

const pageSize = 5;
const dotLabels = ["非常偏左", "比较偏左", "稍微偏左", "居中", "稍微偏右", "比较偏右", "非常偏右"];

function questionRow(i) {
  const [, prompt, first, second] = questions[i];
  return `<fieldset class="quiz-row">
    <legend><span class="question-number">${String(i + 1).padStart(2, "0")}</span>${prompt}</legend>
    <div class="dot-ends${first ? " dot-ends-paired" : ""}"><span>${first ?? "不同意"}</span><span>${second ?? "同意"}</span></div>
    <div class="dot-grid">
      ${dotLabels.map((label, position) => `<label class="dot-option">
        <input type="radio" name="q${i}" value="${position}" aria-label="${label}" ${answers[i] === scoreForPosition(i, position) ? "checked" : ""}>
        <span class="dot dot-${position}" aria-hidden="true"></span>
      </label>`).join("")}
    </div>
  </fieldset>`;
}

function scoreForPosition(i, position) {
  return questions[i].length === 4 ? 3 - position : position - 3;
}

function question(page) {
  const start = page * pageSize;
  const end = Math.min(start + pageSize, questions.length);
  const indices = Array.from({length: end - start}, (_, offset) => start + offset);
  const last = end === questions.length;
  const answered = () => indices.filter(i => answers[i] != null).length;
  render(`<section class="quiz-sheet">
    <header class="quiz-header">
      <h1 class="sr" tabindex="-1">测验第 ${page + 1} 页</h1>
      ${page === 0 ? '<p class="quiz-note">这几题都没有标准答案，按你平时的习惯选就好。</p>' : ""}
      <div class="quiz-progress"><span>第 ${page + 1} / ${Math.ceil(questions.length / pageSize)} 页</span><span id="page-count">${answered()} / ${indices.length} 已答</span></div>
      <progress value="${start + answered()}" max="${questions.length}" aria-label="答题进度"></progress>
    </header>
    ${indices.map(questionRow).join("")}
    <div class="actions quiz-actions"><button id="back">${page === 0 ? "返回封面" : "上一页"}</button><button class="primary" id="next" ${answered() < indices.length ? "disabled" : ""}>${last ? "查看结果" : "下一页"}</button></div>
    <p class="foot" id="remaining" aria-live="polite" ${answered() === indices.length ? "hidden" : ""}>本页还剩 ${indices.length - answered()} 题，答完即可继续。</p>
  </section>`);
  app.querySelector(".quiz-sheet").addEventListener("change", event => {
    const { name, value } = event.target;
    const i = Number(name.slice(1));
    answers[i] = scoreForPosition(i, Number(value));
    document.getElementById("page-count").textContent = `${answered()} / ${indices.length} 已答`;
    app.querySelector("progress").value = answers.filter(value => value != null).length;
    document.getElementById("next").disabled = answered() < indices.length;
    const remaining = document.getElementById("remaining");
    remaining.hidden = answered() === indices.length;
    remaining.textContent = `本页还剩 ${indices.length - answered()} 题，答完即可继续。`;
  });
  bind("back", () => page === 0 ? home(false) : question(page - 1));
  bind("next", () => {
    if (!last) {
      question(page + 1);
      return;
    }
    extra = [];
    const scores = scoresFor(answers);
    const zeros = [0, 1, 2, 3].filter(axis => scores[axis] === 0);
    if (zeros.length) tie(scores, zeros, 0);
    else result(scores);
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
        question(Math.ceil(questions.length / pageSize) - 1);
        return;
      }
      extra[axis] = choice === 0 ? "A" : "B";
      if (step + 1 < zeros.length) tie(scores, zeros, step + 1);
      else result(scores);
    }
  });
}

function analysisFor(score, direction, i) {
  const [, a, b] = axes[i];
  const preference = direction === "A" ? a : b;
  if (score === 0) return `两边得分相同，补选时你更倾向「${preference}」。`;
  if (Math.abs(score) <= weakScore) return `两种方式你都用得上，这次略偏向「${preference}」。`;
  const descriptions = [
    ["弄明白一个困惑已久的问题，最容易让你觉得学得值。", "学到的知识真的帮你做成一件事时，你更有成就感。"],
    ["时间不够时，你倾向把精力集中在最影响后续的难点上。", "任务一多，你倾向先让各项都有进展，再回头补重点。"],
    ["读病例时，你习惯先理清变化的顺序，再追问它们怎么连起来。", "读病例时，你倾向先摆出几种解释，再找能区分它们的线索。"],
    ["和同学合作时，你更习惯先对齐共同思路，再各自推进。", "和同学合作时，你更喜欢先让各自的想法成形，再一起比较和整合。"]
  ];
  return descriptions[i][direction === "A" ? 0 : 1];
}

function overviewFor(scores, directions) {
  const habits = [
    ["弄懂原来卡住的地方", "看到学过的东西派上用场"],
    ["留整段时间处理一个关键难点", "让手头几项任务都先往前走"],
    ["沿病程把变化串起来", "把几种可能解释放在一起比较"],
    ["先和大家商量一个共同框架", "先听各自的想法，再一起整合"]
  ];
  const leadIns = ["学习时，你", "时间紧时，你", "读病例时，你", "做小组任务时，你"];
  const strongest = Math.max(...scores.map(Math.abs));
  return scores.map((score, i) => {
    const habit = habits[i][directions[i] === "A" ? 0 : 1];
    if (score === 0) return `${leadIns[i]}两边得分相同，补选更偏向「${habit}」。`;
    const strength = Math.abs(score) <= weakScore ? "稍偏向" : Math.abs(score) === strongest ? "尤其倾向" : "倾向";
    return `${leadIns[i]}${strength}${habit}。`;
  }).join("");
}

function result(scores) {
  const directions = directionsFor(scores, extra);
  const code = directions.join("");
  const [title, portrait, quote] = books[code];
  recordFirstResult(code);
  render(`<header class="result-head"><p class="eyebrow">你的“天选”教材</p><h1 tabindex="-1">你是《${title}》</h1></header>
    ${cover(title, title === "医学统计学" ? "original" : "matched")}
    <section class="panel details"><blockquote class="book-quote">「${quote}」</blockquote>
    <h2>你和这本书的相似之处</h2><p>${portrait}</p>
    <h2>你的答题画像</h2><p>${overviewFor(scores, directions)}</p>
    <h2>你的四项答题倾向</h2>
    ${scores.map((score, i) => `<div class="axis">
      <strong>${axes[i][0]}</strong>${Math.abs(score) <= weakScore ? '<small>两边都用得上</small>' : ""}
      <div class="scale" role="meter" aria-label="${axes[i][0]}" aria-valuemin="${-maxAxisScore}" aria-valuemax="${maxAxisScore}" aria-valuenow="${score}" aria-valuetext="${score === 0 ? "居中" : "偏向" + axes[i][score > 0 ? 1 : 2]}"><i style="--position:${50 - 50 * score / maxAxisScore}%"></i></div>
      <div class="ends"><span>${axes[i][1]}</span><span>${axes[i][2]}</span></div>
      <p class="axis-description">${analysisFor(score, directions[i], i)}</p>
    </div>`).join("")}</section>
    <button class="primary full" id="restart">再测一次</button><p class="foot">医学生学习方式趣味测验</p>`);
  bind("restart", home);
}

home();
