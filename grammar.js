/**
 * @file Smarty grammar for tree-sitter
 * @author hex-cat-man <hex-cat-man@tutanota.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "smarty",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
