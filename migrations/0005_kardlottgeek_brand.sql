-- Update only the untouched starter identity; preserve any brand the owner has customized.
UPDATE settings SET value='Kardlottgeek' WHERE key='brand' AND value='Zynutz 3D';
UPDATE settings SET value='Ideias criativas, feitas em 3D.' WHERE key='tagline' AND value='Ideias reais, impressas em 3D.';
