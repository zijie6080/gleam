import assert from "node:assert/strict";
import test from "node:test";
import { detectCrisis, isNightMode } from "../lib/night";
import { moderate } from "../lib/moderation";

test("危机文字会进入保护模式", () => {
  assert.equal(detectCrisis("我最近总是想死"), true);
  assert.equal(detectCrisis("我梦见一片平静的海"), false);
});

test("只有深夜且情绪明显负面时进入深夜模式", () => {
  assert.equal(isNightMode(2, -0.8), true);
  assert.equal(isNightMode(12, -0.8), false);
  assert.equal(isNightMode(2, 0.2), false);
});

test("公开内容会拦截明显广告和暴力文字", () => {
  assert.equal(moderate("加微信领取贷款").ok, false);
  assert.equal(moderate("我梦见山谷里有一束光").ok, true);
});

