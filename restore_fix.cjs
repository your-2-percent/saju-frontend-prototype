const fs = require('fs');
const lines = fs.readFileSync('C:/Users/uniqu/.claude/projects/c--Users-uniqu-Desktop-frontend-hwarim/f8929a38-1f51-4811-b40c-3f81119ad5d0.jsonl', 'utf8').split('\n').filter(Boolean);

const editLines = [410, 431, 452, 482, 499];
let sections = [];
for (const li of editLines) {
  const obj = JSON.parse(lines[li]);
  const msg = obj.message || obj;
  const content = Array.isArray(msg.content) ? msg.content : [msg.content];
  for (const item of content) {
    if (item && item.type === 'tool_use' && item.name === 'Edit' && item.input &&
        item.input.file_path && item.input.file_path.includes('sajuNoteArticles') && item.input.new_string) {
      sections.push(item.input.new_string);
    }
  }
}
console.log('sections:', sections.length, sections.map(s => s.length));

// section[0] contains the full second <section> opening + I/II articles + IX/X articles
// Need to reconstruct the full 병존물상 block
// section[0]: </section>\n\n  <section>...header... + I.갑목 + II.을목
// section[1]: III.병화 + IV.정화
// section[2]: V.무토 + VI.기토 (starts with closing li+ul+article from IV, then V and VI)
// section[3]: VII.경금 + VIII.신금 (starts with closing ul+article, then VII, VIII)
// section[4]: IX.임수 + X.계수 ending (starts with closing li, then IX/X via the additions made later)

// Let's just extract the articles from each section
sections.forEach((s, i) => {
  fs.writeFileSync(`section_${i}.txt`, s, 'utf8');
});
console.log('Saved section files');
