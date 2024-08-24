import { Sequelize, DataTypes } from "sequelize";
import pg from "pg";

const { Client } = pg;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const CONNECTION_STRING =
  "postgres://postgres:postgres@localhost:5432/pg_bug_repro_dev";

const sequelize = new Sequelize(CONNECTION_STRING);

const getTypeParser = () => {
  return (value) => {
    if (
      typeof value === "string" &&
      value.startsWith("{") &&
      value.endsWith("}")
    ) {
      return value.slice(1, -1).split(",");
    }
    return value;
  };
};

const client = new Client({
  connectionString: CONNECTION_STRING,
  types: {
    getTypeParser,
  },
});

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
    },
    roles: {
      type: DataTypes.ARRAY(DataTypes.ENUM("Admin", "View")),
    },
  },
  { timestamps: false }
);

const setupDb = async () => {
  while (true) {
    try {
      await sequelize.authenticate();
      break;
    } catch {
      console.log("Waiting for DB to start");
      await delay(2000);
    }
  }
  console.log("Connection established");
  await sequelize.sync({ force: true });
  await client.connect();
  await client.query(`TRUNCATE "Users";`);
};

const main = async () => {
  await setupDb();

  const singleStatementResult = await client.query(
    'INSERT INTO "Users" ("id","name","roles") VALUES (DEFAULT,$1,$2) RETURNING "id","name","roles";',
    ["Name", "{Admin,View}"]
  );
  console.log("Single statement insert result is:");
  // Observe that the "roles" column gets correctly parsed into an array as per getTypeParser
  console.log(singleStatementResult.rows);

  const multiStatementResult = await client.query(
    `CREATE OR REPLACE FUNCTION pg_temp.testfunc(OUT response "Users", OUT sequelize_caught_exception text) RETURNS RECORD AS $func_6020ceb2c2d3491c8a77fe107dbabe02$ BEGIN INSERT INTO "Users" ("id","name","roles") VALUES (DEFAULT,'Name',ARRAY['Admin']::"enum_Users_roles"[]) RETURNING * INTO response; EXCEPTION WHEN unique_violation THEN GET STACKED DIAGNOSTICS sequelize_caught_exception = PG_EXCEPTION_DETAIL; END $func_6020ceb2c2d3491c8a77fe107dbabe02$ LANGUAGE plpgsql; SELECT (testfunc.response)."id", (testfunc.response)."name", (testfunc.response)."roles", testfunc.sequelize_caught_exception FROM pg_temp.testfunc(); DROP FUNCTION IF EXISTS pg_temp.testfunc();`
  );
  console.log("Multi statement insert result is:");
  multiStatementResult.forEach((result) => {
    if (result.rows.length) {
      // Observe that the "roles" column does not get parsed
      console.log(result.rows);
    }
  });
  await client.end();
};

await main().catch(console.error);
