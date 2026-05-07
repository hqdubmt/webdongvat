# MasterLMS Web â€” Kiáº¿n trĂºc & Lá»™ trĂ¬nh

## Luá»“ng Ä‘á»c vĂ  cache dá»¯ liá»‡u

### Äá»c chi tiáº¿t loĂ i

1. Frontend gá»i `GET /api/species/:slug`.
2. Backend kiá»ƒm tra Redis key `species:detail:{slug}`. [cite:22][cite:23]
3. Náº¿u cĂ³ cache thĂ¬ tráº£ ngay dá»¯ liá»‡u JSON. [cite:22][cite:23]
4. Náº¿u khĂ´ng cĂ³ thĂ¬ query PostgreSQL, join áº£nh vĂ  tá»a Ä‘á»™, sau Ä‘Ă³ ghi láº¡i cache báº±ng TTL. [cite:22][cite:23]
5. Tráº£ dá»¯ liá»‡u vá» frontend.

### Cáº­p nháº­t loĂ i hoáº·c áº£nh

1. Admin gá»i API cáº­p nháº­t.
2. Backend ghi PostgreSQL trÆ°á»›c vĂ¬ Ä‘Ă¢y lĂ  nguá»“n dá»¯ liá»‡u chĂ­nh. [cite:22]
3. Náº¿u cĂ³ thay Ä‘á»•i áº£nh thĂ¬ upload hoáº·c xĂ³a object trĂªn MinIO tÆ°Æ¡ng á»©ng. [cite:35][cite:37]
4. XĂ³a cĂ¡c key cache liĂªn quan nhÆ° `species:detail:{slug}` vĂ  cache danh sĂ¡ch. [cite:22]
5. Request Ä‘á»c tiáº¿p theo sáº½ tá»± náº¡p láº¡i cache má»›i.

## Google Maps

Má»—i loĂ i nĂªn cĂ³ Ă­t nháº¥t má»™t cáº·p `latitude`, `longitude` Ä‘á»ƒ cĂ³ thá»ƒ má»Ÿ trĂªn Google Maps. Google Maps há»— trá»£ tĂ¬m trá»±c tiáº¿p theo tá»a Ä‘á»™, nĂªn frontend chá»‰ cáº§n táº¡o link dáº¡ng `https://www.google.com/maps?q=lat,lng` lĂ  cĂ³ thá»ƒ dĂ¹ng Ä‘Æ°á»£c ngay. [cite:7][cite:13]

VĂ­ dá»¥:

```text
https://www.google.com/maps?q=10.8231,106.6297
```

CĂ¡ch nĂ y Ä‘á»§ tá»‘t cho MVP. Khi cáº§n nĂ¢ng cáº¥p, cĂ³ thá»ƒ thĂªm báº£n Ä‘á»“ nhĂºng hoáº·c marker nhiá»u Ä‘iá»ƒm cho cĂ¹ng má»™t loĂ i.

## CĂ´ng nghá»‡ Ä‘á» xuáº¥t

| ThĂ nh pháº§n      | Gá»£i Ă½                              |
| --------------- | ---------------------------------- |
| Frontend        | Next.js hoáº·c React                 |
| Backend         | Node.js + Express hoáº·c Fastify     |
| ORM / Query     | Prisma hoáº·c `pg` / Knex            |
| Database chĂ­nh  | PostgreSQL                         |
| Cache           | Redis                              |
| LÆ°u áº£nh         | MinIO [cite:35][cite:37]           |
| CI/CD           | GitHub Actions [cite:38][cite:44]  |
| Deploy local    | Docker Compose                     |

## MĂ´ hĂ¬nh GitHub vĂ  2 server

Code nĂªn Ä‘Æ°á»£c lÆ°u trĂªn GitHub vĂ  tĂ¡ch rĂµ hai mĂ´i trÆ°á»ng: `dev` vĂ  `production`. GitHub Environments cho phĂ©p táº¡o mĂ´i trÆ°á»ng riĂªng, gáº¯n secrets riĂªng, quy táº¯c deploy riĂªng vĂ  báº£o vá»‡ production báº±ng reviewer hoáº·c branch rule. [cite:38][cite:44]

HÆ°á»›ng tá»• chá»©c nĂªn lĂ :

- NhĂ¡nh `develop`: deploy lĂªn server dev.
- NhĂ¡nh `main`: deploy lĂªn server production sau khi Ä‘Ă£ test á»•n á»Ÿ dev. [cite:38]
- Má»—i mĂ´i trÆ°á»ng cĂ³ bá»™ secrets riĂªng nhÆ° `DB_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`. [cite:44]
- Dev vĂ  production pháº£i dĂ¹ng database, Redis vĂ  MinIO bucket riĂªng Ä‘á»ƒ trĂ¡nh ghi Ä‘Ă¨ dá»¯ liá»‡u tháº­t. [cite:38]

VĂ­ dá»¥ phĂ¢n tĂ¡ch háº¡ táº§ng:

- Server dev: `api-dev.domain.com`, `postgres_dev`, `redis_dev`, bucket `species-dev`.
- Server production: `api.domain.com`, `postgres_prod`, `redis_prod`, bucket `species-prod`.

GitHub Docs cho biáº¿t mĂ´i trÆ°á»ng deploy cĂ³ thá»ƒ gáº¯n protection rules, environment secrets vĂ  branch restrictions, nĂªn Ä‘Ă¢y lĂ  cĂ¡ch ráº¥t há»£p Ä‘á»ƒ kiá»ƒm soĂ¡t deploy production cháº·t hÆ¡n mĂ´i trÆ°á»ng dev. [cite:44]

## Gá»£i Ă½ thÆ° má»¥c dá»± Ă¡n

```text
project/
  apps/
    web/
    api/
  packages/
    shared/
  infra/
    docker/
    nginx/
    github-actions/
  docs/
  .github/
    workflows/
      deploy-dev.yml
      deploy-prod.yml
```

Náº¿u muá»‘n Ä‘Æ¡n giáº£n hÆ¡n, váº«n cĂ³ thá»ƒ giá»¯ 2 thÆ° má»¥c `frontend/` vĂ  `backend/`, nhÆ°ng vá»›i há»‡ thá»‘ng cĂ³ 2 server vĂ  CI/CD thĂ¬ chia rĂµ `apps/` vĂ  `infra/` sáº½ dá»… quáº£n lĂ½ hÆ¡n.

## Gá»£i Ă½ deploy

### Server dev

- Tá»± Ä‘á»™ng deploy khi push vĂ o `develop`.
- DĂ¹ng Ä‘á»ƒ test API, upload áº£nh MinIO, cache Redis vĂ  luá»“ng Google Maps. [cite:38]

### Server production

- Chá»‰ deploy khi merge vĂ o `main` hoáº·c release tag.
- NĂªn cĂ³ approval trÆ°á»›c khi cháº¡y workflow production. [cite:38][cite:44]
- Production pháº£i dĂ¹ng secrets riĂªng vĂ  háº¡ táº§ng tĂ¡ch biá»‡t khá»i dev. [cite:38]

## Lá»™ trĂ¬nh thá»±c hiá»‡n

### Giai Ä‘oáº¡n 1: Dá»±ng lĂµi backend

1. Táº¡o project Node.js.
2. Káº¿t ná»‘i PostgreSQL.
3. Táº¡o báº£ng `species`, `species_images`, `species_locations`.
4. Seed 20 Ä‘áº¿n 50 loĂ i máº«u.
5. LĂ m API danh sĂ¡ch vĂ  chi tiáº¿t.

### Giai Ä‘oáº¡n 2: TĂ­ch há»£p MinIO vĂ  Redis

1. Dá»±ng MinIO local báº±ng Docker Compose. [cite:37]
2. LĂ m API upload áº£nh lĂªn MinIO. [cite:35][cite:37]
3. LÆ°u metadata áº£nh vĂ o PostgreSQL.
4. ThĂªm Redis cache cho API danh sĂ¡ch vĂ  chi tiáº¿t. [cite:22][cite:23]
5. ThĂªm invalidate cache khi cáº­p nháº­t dá»¯ liá»‡u. [cite:22]

### Giai Ä‘oáº¡n 3: Gáº¯n frontend

1. LĂ m trang danh sĂ¡ch loĂ i.
2. LĂ m trang chi tiáº¿t cĂ³ gallery áº£nh.
3. Hiá»ƒn thá»‹ danh sĂ¡ch tá»a Ä‘á»™.
4. Gáº¯n nĂºt má»Ÿ Google Maps theo `lat,lng`. [cite:7][cite:13]

### Giai Ä‘oáº¡n 4: GitHub vĂ  deploy 2 mĂ´i trÆ°á»ng

1. ÄÆ°a code lĂªn GitHub.
2. Táº¡o GitHub Environments cho `development` vĂ  `production`. [cite:44]
3. TĂ¡ch secrets cho tá»«ng mĂ´i trÆ°á»ng. [cite:44]
4. Thiáº¿t láº­p workflow deploy dev vĂ  workflow deploy production cĂ³ approval. [cite:38][cite:44]

## Nhá»¯ng viá»‡c nĂªn lĂ m ngay

- Chá»‘t schema PostgreSQL trÆ°á»›c khi code API.
- Quy Æ°á»›c cĂ¡ch Ä‘áº·t `object_key` cho áº£nh trĂªn MinIO ngay tá»« Ä‘áº§u. [cite:35][cite:37]
- LĂ m API chi tiáº¿t loĂ i trÆ°á»›c, rá»“i má»›i thĂªm cache Redis. [cite:22][cite:23]
- DĂ¹ng link Google Maps theo tá»a Ä‘á»™ Ä‘á»ƒ ra MVP nhanh nháº¥t. [cite:7][cite:13]
- TĂ¡ch secrets dev vĂ  production trĂªn GitHub Environments thay vĂ¬ hardcode vĂ o repo. [cite:44]
- KhĂ´ng dĂ¹ng chung database, Redis hoáº·c bucket MinIO giá»¯a dev vĂ  production. [cite:38]