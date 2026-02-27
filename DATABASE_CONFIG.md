# ⚠️ CONFIGURATION BASE DE DONNÉES - NE PAS MODIFIER ⚠️

## Base de données PRODUCTION

**URL**: `https://wzcjdxerspwafrzrcada.supabase.co`
**ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Y2pkeGVyc3B3YWZyenJjYWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTgwMTYsImV4cCI6MjA4MzYzNDAxNn0._82mPeIsWqGzD4u3b0QyzxgkQz1kYv2xJa9LxQCHzoQ`

## ⛔ ANCIENNE BASE À NE PLUS UTILISER

~~https://oxajvxlqmknkphbfkxqh.supabase.co~~

## Fichiers à vérifier

Si le projet revient sur l'ancienne base, vérifier ces fichiers:
- `.env`
- `.env.local` (prioritaire sur .env)
- `src/main.tsx` (contient une vérification)

## Ordre de priorité Vite

Vite charge les fichiers dans cet ordre (du plus prioritaire au moins prioritaire):
1. `.env.local` ← **CRÉÉ POUR CETTE RAISON**
2. `.env`

En créant `.env.local`, on s'assure que même si `.env` est écrasé, la bonne config est utilisée.
