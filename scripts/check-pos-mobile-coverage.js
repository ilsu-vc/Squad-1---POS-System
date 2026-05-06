const fs = require('fs');
const path = require('path');

const minimum = 60;
const summaryPath = path.join(__dirname, '..', 'coverage', 'pos-mobile', 'coverage-summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = summary.total;
const metrics = ['statements', 'lines', 'functions'];
const failures = metrics.filter((metric) => total[metric].pct < minimum);

if (failures.length > 0) {
  console.error(`POS mobile coverage must stay at or above ${minimum}% for ${failures.join(', ')}.`);
  failures.forEach((metric) => {
    console.error(`- ${metric}: ${total[metric].pct}%`);
  });
  process.exit(1);
}

console.log(
  `POS mobile coverage OK: statements ${total.statements.pct}%, lines ${total.lines.pct}%, functions ${total.functions.pct}%.`
);
