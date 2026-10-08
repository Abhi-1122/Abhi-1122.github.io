// node --experimental-detect-module app/lib/skills.check.mjs
import assert from "node:assert/strict";
import { SKILLS } from "../data/portfolioData.js";
import { SKILL_GROUP_COLORS, tilesForSkill } from "./skills.js";

const ids = (s) => tilesForSkill(s).map((t) => t.id).sort();
assert.deepEqual(ids("Go"), ["cuffka"]);
assert.deepEqual(ids("C"), ["cshell", "docspp", "sham"]); // never "Tailwind CSS"
assert.deepEqual(ids("C++"), ["hawkes", "tokengemm"]); // "C++17" and "C++"
assert.deepEqual(ids("FPGA"), ["tokengemm"]);
assert.deepEqual(ids("HBM"), ["tokengemm"]); // "HBM2"
assert.deepEqual(ids("C/C++"), ["cshell", "docspp", "hawkes", "sham", "tokengemm"]);
assert.ok(ids("React").includes("buysell")); // "React.js"
assert.ok(ids("React.js").includes("blockdrop")); // "React"
assert.deepEqual(ids("PyTorch"), ["bharatslm", "research"]);
assert.deepEqual(ids("Graph Neural Nets"), ["research"]);
assert.deepEqual(ids("Docker"), ["churnsense"]);
assert.deepEqual(ids("Node.js"), ["buysell"]);
assert.deepEqual(ids("Linux"), ["cshell", "sham"]);
assert.deepEqual(ids("TCP/IP"), ["cuffka", "docspp"]);
assert.deepEqual(ids("Multithreading"), ["docspp"]);
assert.deepEqual(ids("MySQL"), []); // "SQL" doesn't leak into MySQL, nor back
assert.ok(!ids("SQL").includes("buysell"));

// every group has a colour and 2+ items, no duplicate skills
const all = SKILLS.flatMap((g) => g.items);
assert.equal(new Set(all).size, all.length);
for (const g of SKILLS) assert.ok(SKILL_GROUP_COLORS[g.group] && g.items.length > 1, g.group);
console.log(`skills ok: ${all.length} skills; no projects: ${all.filter((s) => !tilesForSkill(s).length).join(", ")}`);
