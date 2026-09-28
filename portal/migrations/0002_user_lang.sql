-- The language someone registered in (en, de, es, pl, cs, sv). Their emails from the portal use it.
ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
