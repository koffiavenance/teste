# Bloom Shoes — site vitrine & boutique

Site de vente de chaussures en cuir pour homme (Abidjan, Adjamé). Les commandes sont envoyées directement sur WhatsApp Business (**07 48 11 09 42**).

## Pages

| Page | Rôle |
|------|------|
| `index.html` | Le site pour les clients : vitrine animée, catégories, boutique, formulaire de commande, guide des pointures, contact. |
| `admin.html` | L'administration : modifier les produits (image, nom, prix, description, couleurs), les catégories et les infos de la boutique. |

## Comment un client commande

1. Il clique sur un produit dans la boutique.
2. Il remplit le formulaire : nom, prénom, téléphone/WhatsApp, ville, couleur, pointure, quantité, confort souhaité (très souple, souple, ferme) et une petite description.
3. Il clique sur **« Valider ma commande sur WhatsApp »** : WhatsApp s'ouvre avec la commande déjà rédigée vers votre numéro. Il lui reste à appuyer sur « Envoyer ».

## Modifier le catalogue (admin.html)

1. Ouvrez `https://<votre-site>/admin.html`.
2. Modifiez ce que vous voulez : tout est enregistré automatiquement **sur votre appareil**.
3. **Aperçu du site** : affiche le site avec vos modifications (visible par vous seul).
4. **Publier en ligne** : envoie vos modifications sur le site pour que tous les clients les voient (1 à 2 minutes).

### Clé d'accès pour publier (à faire une seule fois)

1. Sur GitHub : *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*.
2. *Repository access* : choisissez uniquement le dépôt du site.
3. *Permissions → Contents* : **Read and write**.
4. Copiez la clé (`github_pat_…`) et collez-la dans l'onglet **Publication** de `admin.html`.

La clé reste uniquement dans votre navigateur. Sans elle, personne ne peut modifier le site en ligne, même s'il ouvre `admin.html`.

## Mettre le site en ligne (GitHub Pages, gratuit)

1. Fusionnez cette branche dans `main`.
2. Dans le dépôt : *Settings → Pages → Source : Deploy from a branch → `main` / root*.
3. Le site est disponible sur `https://<compte>.github.io/<depot>/`.

### Nom de domaine

`bloomshoes.com` était disponible au moment de la création du site (environ 16 USD la première année). On peut aussi prendre `bloomshoes.shop` ou `bloomshoes.store`, ou bien un `.ci` (auprès d'un registraire ivoirien). Une fois le domaine acheté, renseignez-le dans *Settings → Pages → Custom domain*.

## Structure

```
index.html, admin.html
assets/css/style.css     styles
assets/js/app.js         boutique + commande WhatsApp
assets/js/admin.js       administration + publication
data/catalogue.js        catalogue (produits, catégories, infos)
images/site/             logo, vitrine, favicon
images/produits/         photos des produits
```
