/**
 * @file Smarty grammar for tree-sitter
 * @author hex-cat-man <hex-cat-man@tutanota.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// This is just my assumtion what a valid smarty identifier might look like.
//
// https://www.php.net/manual/en/language.variables.basics.php
const REGEX_IDENTIFIER = /[a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*/;

module.exports = grammar({
  name: "smarty",

  conflicts: $ => [
    [$._smarty, $.block],
  ],

  extras: $ => [
    $.comment,
    /\s/,
  ],

  rules: {
    template: $ => repeat($._smarty),
    _smarty: $ => choice(
      $.tag,
      $.block,
      $.text,
    ),

    // Tag delimiters followed by whitespace are treated as text.
    text: _ => prec.right(repeat1(
      choice(
        /[^\{]+|\{/,
        // Docs say "surrounded by whitespace" but the only requirement seems
        // to be that the left delimiter is followed by whitespace.
        token.immediate(seq('{', /\s/)),
      ),
    )),

    // TODO: I would like to match the '{' and '*' as separate tokens to be able
    //       to highlight them differently (like in the smarty documentation).
    //       But we cannot use token.immidiate (I think?), since comments
    //       themselfs are extras.
    comment: _ => seq(
      '{*',
      repeat(choice(
        /[^*]+/,
        token.immediate(seq('*', /[^\}]/)),
      )),
      '*}',
    ),

    identifier: _ => REGEX_IDENTIFIER,

    tag: $ => seq(
      '{',
      $.identifier,
      '}',
    ),

    end_tag: $ => seq(
      '{/',
      $.identifier,
      '}',
    ),

    block: $ => seq(
      $.tag,
      alias(repeat($._smarty), $.body),
      $.end_tag,
    ),

    // TODO: tag_function and tag_attributes.
    //
    // tag_function: $ => seq(
    //   $.tag_function_name,
    //   $.tag_attributes,
    // ),
    // tag_function_name: $ => alias($.identifier, 'tag_function_name'),
    // tag_attributes: $ => repeat($.tag_attribute),
    // tag_attribute: $ => choice(/* ... */),
  }
});
