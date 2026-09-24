import asyncio
import time
from parsers import detect_and_parse
from osv_client import query_osv_batch
from registry_client import fetch_package_metadata

sample_package_json = """{
  "name": "large-benchmark-app",
  "dependencies": {
    "express": "4.16.0",
    "lodash": "4.17.15",
    "axios": "0.19.0",
    "moment": "2.24.0",
    "react": "17.0.2",
    "react-dom": "17.0.2",
    "webpack": "5.74.0",
    "babel-core": "6.26.3",
    "typescript": "4.5.4",
    "next": "12.0.7",
    "gatsby": "4.2.0",
    "vue": "3.2.26",
    "angular": "1.8.2",
    "jquery": "3.5.1",
    "bootstrap": "4.5.3",
    "tailwindcss": "3.0.7",
    "postcss": "8.4.5",
    "autoprefixer": "10.4.0",
    "eslint": "8.5.0",
    "prettier": "2.5.1",
    "jest": "27.4.5",
    "mocha": "9.1.3",
    "chai": "4.3.4",
    "cypress": "9.1.1",
    "storybook": "6.4.9",
    "commander": "8.3.0",
    "chalk": "4.1.2",
    "debug": "4.3.3",
    "fs-extra": "10.0.0",
    "glob": "7.2.0",
    "semver": "7.3.5",
    "uuid": "8.3.2",
    "dotenv": "10.0.0",
    "cors": "2.8.5",
    "helmet": "4.6.0",
    "morgan": "1.10.0",
    "winston": "3.3.3",
    "mongoose": "6.1.2",
    "sequelize": "6.12.0",
    "pg": "8.7.1",
    "mysql2": "2.3.3",
    "redis": "4.0.1",
    "ioredis": "4.28.2",
    "socket.io": "4.4.0",
    "ws": "8.4.0",
    "graphql": "16.2.0",
    "apollo-server": "3.6.0",
    "type-graphql": "1.1.1",
    "prisma": "3.7.0",
    "mikro-orm": "4.5.10",
    "knex": "0.95.15",
    "typeorm": "0.2.41",
    "rxjs": "7.5.1",
    "redux": "4.1.2",
    "mobx": "6.3.10",
    "recoil": "0.5.2",
    "zustand": "3.6.8",
    "chart.js": "3.6.2",
    "d3": "7.2.1",
    "three": "0.136.0",
    "phaser": "3.55.2",
    "pixi.js": "6.2.0",
    "leaflet": "1.7.1",
    "mapbox-gl": "2.6.1",
    "puppeteer": "13.0.0",
    "playwright": "1.17.1",
    "cheerio": "1.0.0-rc.10",
    "jsdom": "19.0.0",
    "nodemailer": "6.7.2",
    "twilio": "3.72.0",
    "stripe": "8.195.0",
    "algoliasearch": "4.12.0",
    "elasticsearch": "16.7.3",
    "neo4j-driver": "4.4.1",
    "classnames": "2.3.1",
    "clsx": "1.1.1",
    "ramda": "0.27.1",
    "rxjs-compat": "6.6.7",
    "marked": "4.0.10",
    "highlight.js": "11.4.0",
    "katex": "0.15.1",
    "mathjs": "10.0.0",
    "numjs": "0.16.1",
    "sharp": "0.29.3",
    "jimp": "0.16.1",
    "pdf-lib": "1.17.1",
    "xlsx": "0.17.4",
    "csv-parser": "3.0.0",
    "fast-xml-parser": "4.0.1"
  }
}"""

async def run_benchmark():
    print("--- STARTING TIMING BENCHMARK (93 Dependencies) ---")
    t0 = time.time()
    ecosystem, deps = detect_and_parse("package.json", sample_package_json)
    t_parse = time.time() - t0
    print(f"[1] Parsing {len(deps)} deps: {t_parse:.4f}s")

    t1 = time.time()
    osv_results = await query_osv_batch(deps)
    t_osv = time.time() - t1
    print(f"[2] OSV Batch Query & Cache Check: {t_osv:.4f}s")

    t2 = time.time()
    semaphore = asyncio.Semaphore(10)
    async def enrich_dep(dep):
        async with semaphore:
            meta = await fetch_package_metadata(dep["name"], dep["version"], dep["ecosystem"])
            dep.update(meta)
            return dep

    enriched = await asyncio.gather(*[enrich_dep(d) for d in osv_results])
    t_registry = time.time() - t2
    print(f"[3] Registry Metadata Queries ({len(enriched)} packages): {t_registry:.4f}s")

    t_total = time.time() - t0
    print(f"--- TOTAL TIME: {t_total:.4f}s ---")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
