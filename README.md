# Application web de gestion des ressources

Application JavaScript simple avec:
- recherche plein texte sur tous les attributs
- pagination par 20 résultats
- création d'une ressource via un bouton +
- backend Express
- base SQLite en local
- support PostgreSQL en déploiement si `DATABASE_URL` est défini

## 1. Prérequis

- Node.js 20 ou plus
- npm
- Git

## 2. Installation en local

```bash
git clone <votre-repo>
cd resource-manager-app
npm install
npm start
```

L'application sera disponible sur `http://localhost:3000`

## 3. Base de données

### Mode local par défaut
Sans variable d'environnement `DATABASE_URL`, l'application utilise SQLite et crée automatiquement un fichier `data.sqlite` à la racine.

### Mode déploiement recommandé
Si `DATABASE_URL` est défini, l'application bascule automatiquement sur PostgreSQL.

Exemple:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname npm start
```

## 4. Structure du projet

```text
resource-manager-app/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server.js
├── package.json
├── render.yaml
└── README.md
```

## 5. Déploiement gratuit conseillé

### Option recommandée: Render + Neon Postgres

Cette combinaison évite les limites d'un fichier SQLite local sur un hébergement gratuit.

#### Étape A - mettre le code sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <url-de-votre-repo-github>
git push -u origin main
```

#### Étape B - créer la base PostgreSQL chez Neon

1. Créer un compte Neon
2. Créer un projet Postgres gratuit
3. Copier la chaîne de connexion `DATABASE_URL`

#### Étape C - déployer sur Render

1. Créer un compte Render
2. Cliquer sur `New +` puis `Web Service`
3. Connecter le dépôt GitHub
4. Sélectionner le dépôt `resource-manager-app`
5. Paramétrer:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Dans les variables d'environnement, ajouter:
   - `DATABASE_URL` = chaîne Neon
   - `NODE_VERSION` = `20`
7. Choisir le plan gratuit
8. Lancer le déploiement

Render détectera `PORT` automatiquement.

## 6. Déploiement de démonstration le plus simple

### Option alternative: Koyeb avec SQLite

Possible pour une démo rapide, mais non recommandé pour conserver durablement les données. Vous pouvez:
1. pousser le repo sur GitHub
2. créer un Web Service Node.js sur Koyeb
3. laisser l'application fonctionner en SQLite local

## 7. Points d'attention

- Sur un hébergement gratuit, SQLite local est souvent perdu lors des redémarrages ou redeploys
- Pour un usage durable, utiliser PostgreSQL managé
- Le bouton + ouvre un panneau latéral de création
- La recherche est insensible à la casse

## 8. Améliorations possibles

- suppression et modification d'une ressource
- authentification
- tri par colonnes
- validation plus avancée
- vrai moteur full-text PostgreSQL
