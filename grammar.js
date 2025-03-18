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
    [$.tag, $.start_tag],
    [$._access_expression, $.section_access_expression],
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

    // https://smarty-php.github.io/smarty/stable/designers/language-basic-syntax/language-syntax-tags/

    tag: $ => seq(
      '{',
      choice(
        $.tag_function,
        $._expression,
        $.assignment_expression,
      ),
      '}',
    ),

    start_tag: $ => seq(
      '{',
      $.tag_function,
      '}',
    ),

    end_tag: $ => seq(
      '{/',
      $.tag_function_name,
      '}',
    ),

    block: $ => seq(
      $.start_tag,
      alias(repeat($._smarty), $.body),
      $.end_tag,
    ),

    // TODO: tag_function and tag_attributes.

    tag_function: $ => seq(
      $.tag_function_name,
      alias(repeat($.tag_function_attribute), $.tag_function_attributes),
    ),
    tag_function_name: $ => alias($.identifier, 'tag_function_name'),

    // https://smarty-php.github.io/smarty/stable/designers/language-basic-syntax/language-syntax-attributes/

    tag_function_attribute: $ => choice(
      // Option flag (equal to attr=true).
      field('name', $.identifier),
      // Some tag function allow omitting the attribute name.
      field('value', $._expression),
      seq(
        field('name', $.identifier),
        '=',
        field('value', $._expression),
      ),
    ),

    // Expressions

    _expression: $ => choice(
      $._literal,
      $._access_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
    ),

    unary_expression: $ => prec.left(1, choice(
      seq(
        choice('not', '!'),
        $._expression,
      ),
      seq(
        $._expression,
        choice(
          seq('is', optional('not'), 'even'),
          seq('is', optional('not'), 'odd'),
        ),
      ),
    )),

    binary_expression: $ => prec.left(1, seq(
      field('left', $._expression),
      choice(
        '+',
        '-',
        '*',
        '/',
        '==',
        '!=',
        '>',
        '<',
        '>=',
        '<=',
        '===',
        '%',
        '??',
        '?:',

        'and',
        'or',
        'eq',
        'ne',
        'neq',
        'gt',
        'lt',
        'gte',
        'ge',
        'lte',
        'le',
        'mod',
        seq('is', optional('not'), 'div', 'by'),
        seq('is', optional('not'), 'even', 'by'),
        seq('is', optional('not'), 'odd', 'by'),
        seq('is', optional('not'), 'in'),
      ),
      field('right', $._expression),
    )),

    ternary_expression: $ => prec.left(1, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    // Variables

    assignment_expression: $ => seq(
      field('left', $.variable),
      '=',
      field('right', $._expression),
    ),

    _access_expression: $ => choice(
      $.variable,
      $.config_variable,
      $.variable_property,
      $.member_access_expression,
      // Note that only methods can be called, nothing else.
      $.member_call_expression,
      $.smarty_access_expression,
      $.section_access_expression,
      $.array_access_expression,
    ),

    variable: $ => seq('$', $.identifier),
    config_variable: $ => seq('#', $.identifier, '#'),
    variable_property: $ => seq($.variable, '@', field('property', $.identifier)),

    member_access_expression: $ => seq(
      field('object', $._access_expression),
      '->',
      field('name', choice($.variable, $.identifier)),
    ),
    member_call_expression: $ => seq(
      field('object', $._access_expression),
      '->',
      field('name', $.identifier),
      field('arguments', alias($.parenthesised_arguments, $.arguments)),
    ),
    smarty_access_expression: $ => seq(
      field('array', $._access_expression),
      '.',
      field('name', choice($.variable, $.identifier)),
    ),
    section_access_expression: $ => seq(
      field('array', $.variable),
      token.immediate('['),
      field('name', $.identifier),
      ']',
    ),
    array_access_expression: $ => seq(
      $._access_expression,
      token.immediate('['), $._expression, ']',
    ),

    parenthesised_arguments: $ => seq(
      '(',
      optional(seq($.argument, repeat(seq(',', $.argument)))),
      ')',
    ),
    // TODO: Modifier expressions
    // modifier_arguments: $ => repeat1(seq(':', $.argument)),
    argument: $ => $._expression,

    // Literals

    _literal: $ => choice(
      $.null,
      $.boolean,
      $.number,
      $.string,
      $.array,
    ),

    null: _ => 'null',

    boolean: _ => choice('true', 'false'),

    // Supported notations seem to be quite limited.
    number: _ => choice(
      /\d+/,
      /\d+\.\d+/,
      /\d+\./,
      /\.\d+/,
    ),

    // TODO: String interpolation.
    string: $ => choice(
      seq(
        '\'',
        repeat(choice(
          $.escape_sequence,
          alias(
            prec.right(repeat1(token.immediate(prec(1, /\\?[^'\\]+/)))),
            $.string_content,
          ),
        )),
        '\'',
      ),
      seq(
        '"',
        repeat(choice(
          $.escape_sequence,
          alias(
            prec.right(repeat1(token.immediate(prec(1, /\\?[^"\\]+/)))),
            $.string_content,
          ),
        )),
        '"',
      ),
    ),
    escape_sequence: _ => /\\./,

    array: $ => seq(
      '[',
      optional(seq(
        seq($.array_item, repeat(seq(',', $.array_item)), optional(',')),
      )),
      ']'
    ),

    array_item: $ => choice(
      $._expression,
      seq(
        field('key', $._expression),
        '=>',
        field('value', $._expression),
      ),
    ),
  }
});
