import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Prism } from 'prism-react-renderer';
import config from '../docusaurus.config.js';

const require = createRequire(import.meta.url);

test('configured grammars highlight PHP and shell examples', () => {
  const previous = globalThis.Prism;
  globalThis.Prism = Prism;
  try {
    // Load the configured languages with the same PHP dependency as Docusaurus.
    for (const language of config.themeConfig.prism.additionalLanguages ?? []) {
      if (language === 'php') require('prismjs/components/prism-markup-templating.js');
      require(`prismjs/components/prism-${language}.js`);
    }
    for (const [language, source, tokenType] of [
      ['php', '<?php\n$point = new Point(1, 2);', 'keyword'],
      ['bash', 'echo "$HOME" # example', 'string'],
      ['shell', 'echo "$HOME" # example', 'string'],
      ['sh', 'echo "$HOME" # example', 'string'],
    ]) {
      assert.ok(Prism.languages[language], `${language} grammar is loaded`);
      const highlighted = Prism.highlight(source, Prism.languages[language], language);
      assert.ok(highlighted.includes(`class="token ${tokenType}"`), `${language} produces styled tokens`);
    }
  } finally {
    if (previous === undefined) delete globalThis.Prism;
    else globalThis.Prism = previous;
  }
});
