UPDATE candidacy_financing_method
SET label = 'Droits Mon Compte Personnel Formation et ses abondements (Caisse des Dépôts et des Consignations)'
WHERE label = 'Droits CPF et abondements via Mon Compte Personnel Formation';

UPDATE candidacy_financing_method
SET label = 'France Travail', "order" = 2
WHERE label = 'Financement par France Travail';

UPDATE candidacy_financing_method
SET label = 'OPCO', "order" = 3
WHERE label = 'Financement par l''OPCO';

UPDATE candidacy_financing_method
SET label = 'Employeur', "order" = 4
WHERE label = 'Financement par l''employeur';

UPDATE candidacy_financing_method
SET label = 'Région', "order" = 5
WHERE label = 'Financement par la région';

INSERT INTO candidacy_financing_method (label, "order") VALUES ('Autre financement privé', 6);
INSERT INTO candidacy_financing_method (label, "order") VALUES ('Autre financement public', 7);

UPDATE candidacy_financing_method
SET "order" = 8
WHERE label = 'Fonds propres du candidat';

UPDATE candidacy_financing_method
SET "order" = 9
WHERE label = 'Autre source de financement';