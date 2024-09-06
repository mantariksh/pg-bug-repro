import { Sequelize, DataTypes } from "sequelize";

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const sequelize = new Sequelize(
  "postgres://postgres:postgres@localhost:5432/pg_bug_repro_dev"
);

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

const main = async () => {
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
  await User.truncate();
  const [findOrCreateUser] = await User.findOrCreate({
    where: {
      name: "Name",
    },
    defaults: {
      name: "Name",
      roles: ["Admin"],
    },
  });

  // Observe that the type is string instead of array
  console.log(
    "In the findOrCreate result, typeof roles is",
    typeof findOrCreateUser.roles
  );
  console.log(findOrCreateUser.get({ plain: true }));

  const createUser = await User.create({
    name: "Name 2",
    roles: ["Admin", "View"],
  });
  // Observe that the type is string, which is correct
  console.log("In the create result, typeof roles is", typeof createUser.roles);
  console.log(createUser.get({ plain: true }));
};

await main().catch(console.error);
