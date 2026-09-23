---
name: SmartMall Hostinger banner deployment
description: Production home banners require a Hostinger deployment and database migration path that is not present in the repository.
---

The Replit workspace has no Hostinger credentials, deployment script, GitHub Actions workflow, or approved remote migration channel. The live API can therefore be verified read-only, but banner migrations, uploads, and admin creation must wait for an authorized Hostinger release path.

**Why:** The live Hostinger API served older Laravel routes and returned 404 for `/api/v1/home-banners`, while the repository route and local UI were valid. Guessing credentials or pushing code without knowing Hostinger's release process could alter unrelated production behavior.

**How to apply:** Before any future production banner task, establish the authorized deployment method and rollback plan, deploy the Laravel route/controller/model/migration together, then verify the public endpoint and storage URL before creating a test banner.