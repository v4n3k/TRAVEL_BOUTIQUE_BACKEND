CREATE TABLE IF NOT EXISTS "users" (
  id SERIAL PRIMARY KEY,
  login VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "excursions" (
  id SERIAL PRIMARY KEY,
  "imgSrc" VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "categoryName" VARCHAR(255) NOT NULL,
  info VARCHAR(1023) NOT NULL,
  "personsAmount" INT NOT NULL,
  "accompanistsAmount" INT NOT NULL, 
  price INT NOT NULL,
  key VARCHAR(15),
  FOREIGN KEY ("categoryName") REFERENCES "categories"(name)
);

CREATE TABLE IF NOT EXISTS "excursionEvents" (
  id SERIAL PRIMARY KEY,
  "excursionId" INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  time TIME WITHOUT TIME ZONE NOT NULL,
  FOREIGN KEY ("excursionId") REFERENCES "excursions" (id)
);

CREATE TABLE IF NOT EXISTS "categories" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  "imgSrc" VARCHAR(255) NOT NULL,
  type VARCHAR(63) NOT NULL
);

