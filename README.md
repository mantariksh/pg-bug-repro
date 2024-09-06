## Minimal reproducible example of bug with `pg`

The bug is that for multi-line SQL statements, custom parsers passed via `getTypeParser` do not run.

To get started, run `npm install`.

To see the effect of the bug in `pg`, run `npm run start:pg`.

To see the effect of the bug in `sequelize`, run `npm run start:sequelize`.