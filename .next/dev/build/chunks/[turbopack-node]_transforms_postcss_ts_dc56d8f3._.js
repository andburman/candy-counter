module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/repos/candy-counter/candy-counter/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/e7047_e2f32b46._.js",
  "chunks/[root-of-the-server]__add08e79._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/repos/candy-counter/candy-counter/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];