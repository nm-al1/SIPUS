const holidays = new Set([
  ...'01-01 01-16 02-17 03-19 03-21 03-22 04-03 04-05 05-01 05-14 05-27 05-31 06-01 06-16 08-17 08-25 12-25'
    .split(' ')
    .map((d) => '2026-' + d),
  ...'01-01 01-05 02-06 03-08 03-10 03-11 03-26 03-28 05-01 05-06 05-17 05-20 06-01 06-06 08-15 08-17 12-25 12-26'
    .split(' ')
    .map((d) => '2027-' + d),
]);
function wita(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString();
}
function shift(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
async function loadCalendar(db = require('../config/db').pool, lock = '') {
  const [[row]] = await db.query('SELECT holidays FROM school_calendar WHERE id=1 ' + lock);
  return row.holidays;
}
function school(day, extra) {
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(day) && !Object.hasOwn(extra || {}, day);
}
function due(start, extra) {
  let day = start;
  let counted = 0;
  while (true) {
    if (school(day, extra) && ++counted === 3) return day;
    day = shift(day, 1);
  }
}
function nextSchoolDay(day, extra) {
  do {
    day = shift(day, 1);
  } while (!school(day, extra));
  return day;
}
function addSchoolDays(day, count, extra) {
  for (let i = 0; i < count; i++) day = nextSchoolDay(day, extra);
  return day;
}
function reminderDay(dueDate, extra) {
  let day = shift(dueDate, -1);
  while (!school(day, extra)) day = shift(day, -1);
  return day;
}
function lateDays(dueDate, day, extra) {
  let count = 0;
  for (let d = shift(dueDate, 1); d <= day; d = shift(d, 1))
    if (school(d, extra)) count++;
  return count;
}
module.exports = {
  wita,
  shift,
  school,
  due,
  nextSchoolDay,
  addSchoolDays,
  reminderDay,
  lateDays,
  loadCalendar,
};
