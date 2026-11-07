import config from '@toverux/blanc-hopital/oxfmt';
import { defineConfig } from 'oxfmt';

// oxlint-disable-next-line import/no-default-export - oxfmt interface
export default defineConfig({
  ...config,
  // A vendored upstream file keeps its own formatting, so its diff from upstream stays replayable.
  ignorePatterns: ['skills/humanizer/SKILL.md']
});
