import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { AUTHOR, jsonLd, loadPages, metaHtml, renderBody } from '../content.mjs';

const { bySlug } = loadPages();
const author = bySlug.get('om-utvikleren');
const about = bySlug.get('om-kakeklar');

test('author page is first person, has the photo, and ships no TODOs', () => {
  assert.equal(author.photo.src, '/img/maxim.jpg');
  assert.equal(author.photo.width, 400);
  assert.equal(author.photo.height, 400);
  assert.match(author.photo.alt, /Maxim Salnikov/);
  assert.ok(fs.existsSync('public/img/maxim.jpg'));
  const file = fs.readFileSync(author.file, 'utf8');
  assert.doesNotMatch(file, /TODO|<!--/);
  const html = renderBody(author, bySlug);
  assert.match(html, /class="author-photo" src="\/img\/maxim\.jpg" width="400" height="400" alt="Portrett av Maxim Salnikov"/);
  assert.match(html, /far til to barn, på 15 og 4 år/);
  assert.match(html, /Senior Solution Engineer hos Microsoft/);
  assert.match(html, /Prompt Engineering Conference/);
  assert.match(html, /href="https:\/\/github.com\/webmaxru"/);
  assert.match(html, /href="https:\/\/sessionize.com\/maxim-salnikov"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/webmax\/"/);
  assert.match(html, /Jeg /);
  assert.doesNotMatch(html, /\b[Vv]i\b|TODO|<!--/);
});

test('person structured data matches the published bio', () => {
  const person = jsonLd(author, bySlug)['@graph'].find((n) => n['@type'] === 'ProfilePage').mainEntity;
  assert.equal(person.jobTitle, AUTHOR.jobTitle);
  assert.equal(person.worksFor.name, 'Microsoft');
  assert.equal(person.image, 'https://kakeklar.no/img/maxim.jpg');
  assert.equal(person.homeLocation.name, 'Oslo');
  assert.deepEqual(person.sameAs, AUTHOR.sameAs);
  assert.match(person.description, /15 og 4 år/);
});

test('guide byline and Om Kakeklar name the same parent', () => {
  const byline = metaHtml(bySlug.get('hvor-mye-mat-til-barnebursdag'));
  assert.match(byline, /far til to barn på 15 og 4 år og utvikleren bak Kakeklar/);
  const html = renderBody(about, bySlug);
  assert.match(html, /far til to barn på 15 og 4 år/);
  assert.match(renderBody(bySlug.get('bursdagsmuffins'), bySlug), /far til to barn, 15 og 4 år/);
});
