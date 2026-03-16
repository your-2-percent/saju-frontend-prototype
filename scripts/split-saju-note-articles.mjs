import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "src/app/saju-note/sajuNoteArticles.ts");
const articlesDir = path.join(rootDir, "src/app/saju-note/articles");
const articleRoutesPath = path.join(rootDir, "src/app/saju-note/sajuNoteArticleRoutes.ts");

function toPascalCase(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

async function main() {
  const source = await fs.readFile(sourcePath, "utf8");
  const articleMatches = [...source.matchAll(/\{\s*slug:\s*'([^']+)',\s*contentHtml:\s*String\.raw`([\s\S]*?)`,\s*\},?/g)];

  if (articleMatches.length === 0) {
    throw new Error("No articles were found in sajuNoteArticles.ts");
  }

  const articles = articleMatches.map((match) => ({
    slug: match[1],
    contentHtml: match[2],
  }));

  await fs.rm(articlesDir, { recursive: true, force: true });
  await fs.mkdir(articlesDir, { recursive: true });

  await fs.writeFile(
    path.join(articlesDir, "articleTypes.ts"),
    `export type SajuNoteArticle = {
  slug: string;
  contentHtml: string;
};
`,
    "utf8",
  );

  const articleImports = [];
  const articleArrayEntries = [];
  const articleMapEntries = [];
  const pageImports = [];
  const pageRouteEntries = [];

  for (const article of articles) {
    const pascal = toPascalCase(article.slug);
    const articleConst = `${pascal}Article`;
    const pageName = `SajuNote${pascal}Page`;

    await fs.writeFile(
      path.join(articlesDir, `${article.slug}.ts`),
      `import type { SajuNoteArticle } from "@/app/saju-note/articles/articleTypes";

export const ${articleConst}: SajuNoteArticle = {
  slug: "${article.slug}",
  contentHtml: String.raw\`${article.contentHtml}\`,
};
`,
      "utf8",
    );

    await fs.writeFile(
      path.join(rootDir, `src/app/saju-note/${pageName}.tsx`),
      `import SajuNoteArticlePage from "@/app/saju-note/SajuNoteArticlePage";

export default function ${pageName}() {
  return <SajuNoteArticlePage slug="${article.slug}" />;
}
`,
      "utf8",
    );

    articleImports.push(`import { ${articleConst} } from "@/app/saju-note/articles/${article.slug}";`);
    articleArrayEntries.push(`  ${articleConst},`);
    articleMapEntries.push(`  "${article.slug}": ${articleConst},`);
    pageImports.push(`import ${pageName} from "@/app/saju-note/${pageName}";`);
    pageRouteEntries.push(`  { slug: "${article.slug}", path: "/saju-note/${article.slug}/*", Component: ${pageName} },`);
  }

  await fs.writeFile(
    path.join(articlesDir, "index.ts"),
    `${articleImports.join("\n")}
import type { SajuNoteArticle } from "@/app/saju-note/articles/articleTypes";

export type { SajuNoteArticle } from "@/app/saju-note/articles/articleTypes";

export const SAJU_NOTE_ARTICLES: SajuNoteArticle[] = [
${articleArrayEntries.join("\n")}
];

export const SAJU_NOTE_ARTICLE_BY_SLUG: Record<string, SajuNoteArticle> = {
${articleMapEntries.join("\n")}
};
`,
    "utf8",
  );

  await fs.writeFile(
    articleRoutesPath,
    `import type { ComponentType } from "react";
${pageImports.join("\n")}

export type SajuNoteArticleRoute = {
  slug: string;
  path: string;
  Component: ComponentType;
};

export const SAJU_NOTE_ARTICLE_ROUTES: SajuNoteArticleRoute[] = [
${pageRouteEntries.join("\n")}
];
`,
    "utf8",
  );

  console.log(`Split ${articles.length} saju-note articles.`);
}

await main();
