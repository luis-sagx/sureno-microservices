const serviceDatabases = [
  {
    database: 'recommendations_db',
    username: 'recommendations_app',
    password: process.env.RECOMMENDATIONS_DB_PASSWORD,
  },
  {
    database: 'cocktails_db',
    username: 'cocktails_app',
    password: process.env.COCKTAILS_DB_PASSWORD,
  },
];

for (const service of serviceDatabases) {
  if (!service.password) {
    throw new Error(`Missing password for ${service.username}`);
  }

  const serviceDb = db.getSiblingDB(service.database);
  const existingUser = serviceDb.getUser(service.username);
  const credentials = {
    pwd: service.password,
    roles: [{ role: 'readWrite', db: service.database }],
  };

  if (existingUser) {
    serviceDb.updateUser(service.username, credentials);
  } else {
    serviceDb.createUser({ user: service.username, ...credentials });
  }
}
