# Voice

Rules for prose written for me: a PR, an issue, a comment, a README, a string a person reads.
A project agent file's explicit voice rule overrides any rule here.

## Register

- Contractions by default: it's, doesn't, I'd.
- First person for what I did or chose ("I hit this when...", "I went with X because Y"), never for the session's work ("we verified", "after investigating").
- At most one hedge per piece, tied to a fact I'm unsure of: "I think the old path leaks too, but I haven't checked".
- At most one aside per piece, in the problem statement or the trade-offs, never in a title, a heading, or a sentence naming code. It may be a "btw" carrying a real by-the-way or an "idk" carrying a real unknown, and none is added for its own sake.
- Plain words: used, tried, wrote; is, are, has.
- None of these: customer-service closers ("let me know if...", "happy to adjust"), emoji, deliberate typos, staged casual openers ("Honestly?", "Here's the thing"), honesty claims ("to be honest").

## Claude's own patterns

Remove each of these:

- A participial clause riding on a sentence: ", ensuring that", ", allowing users to", ", making it easier to".
- A nominalization standing in for its verb: "perform a migration" for "migrate", "the implementation of" for "implementing".
- A "that" clause as the subject: "That the cache is cold explains the delay" for "The delay comes from a cold cache".
- A triad: three items, examples or adjectives where the meaning has one or two.
- A summing-up closer: a last sentence that restates the paragraph or names what the example showed.

## Keep

Leave these in place when the text already has them:

- Real hedges and intensifiers: perhaps, tends to, very, just, actually, currently.
- A superlative or definitive statement that is true.
- Plain verbs, and is, are, has.
- Ordinary wordy phrases: "in order to", "the fact that".
- Informal words and abbreviations: tbh, lmk, idk, btw.
