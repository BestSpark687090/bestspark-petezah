import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sortedRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure games.json is sorted by label'
    },
    fixable: 'code'
  },
  create(context) {
    return {
      Program() {
        const gamesPath = path.join(__dirname, '../../../public/storage/data/games.json');
        const content = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

        if (Array.isArray(content.games)) {
          const sorted = [...content.games].sort((a, b) =>
            (a.label || '').localeCompare(b.label || '', undefined, { numeric: true, sensitivity: 'base' })
          );

          if (JSON.stringify(sorted) !== JSON.stringify(content.games)) {
            context.report({
              loc: { line: 1, column: 0 },
              message: 'games.json is not sorted by label',
              fix() {
                fs.writeFileSync(gamesPath, JSON.stringify({ ...content, games: sorted }, null, 2) + '\n', 'utf8');
                return null;
              }
            });
          }
        }
      }
    };
  }
};

export default sortedRule;
