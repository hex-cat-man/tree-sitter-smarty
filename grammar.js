/**
 * @file Smarty grammar for tree-sitter
 * @author hex-cat-man <hex-cat-man@tutanota.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// This is just my assumption what a valid smarty identifier might look like.
//
// https://www.php.net/manual/en/language.variables.basics.php
const REGEX_IDENTIFIER = /[a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*/;

// https://www.php.net/manual/en/language.types.string.php#language.types.string.syntax.double
const REGEX_ESC = /\\([nrtvef\\$"]|[0-7]{1,3}|x[0-9A-Fa-f]{1,2}|u\{[0-9A-Fa-f]+\})/;

module.exports = grammar({
  name: "smarty",

  conflicts: $ => [
    [$.tag, $.start_tag],
    // TODO: Understand prec and get rid of those conflicts (if possible).
    [$._access_expression, $.section_access_expression],
    [$.modifier_call_expression, $.argument],
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
      $._builtin_block,
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
    //       But we cannot use token.immediate (I think?), since comments
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

    // Tag functions

    tag_function: $ => seq(
      $.tag_function_name,
      alias(repeat($.tag_function_attribute), $.tag_function_attributes),
    ),
    tag_function_name: $ => prec.right(alias($.identifier, 'tag_function_name')),

    // https://smarty-php.github.io/smarty/stable/designers/language-basic-syntax/language-syntax-attributes/

    tag_function_attribute: $ => choice(
      // Option flag (equal to attr=true).
      field('name', $.identifier),
      // Some tag function allow omitting the attribute name.
      field('value', $._expression),
      seq(
        field('name', $.identifier),
        '=',
        field('value', choice(
          $._expression,
          alias($.identifier, $.string),
        )),
      ),
    ),

    // Builtin blocks
    //
    // Some of the builtin blocks have special syntax we need to handle
    // separately.

    _builtin_block: $ => choice(
      $.if_block,
      $.for_block,
      $.foreach_block,
      $.literal_block,
      $.section_block,
      $.while_block,
    ),

    if_block: $ => seq(
      $.if_start_tag,
      field('body', alias(repeat($._smarty), $.body)),
      field('alternative', optional($._if_alternative)),
      $.if_end_tag,
    ),
    if_start_tag: $ => seq('{', 'if', field('condition', $._expression), '}'),
    if_end_tag: _ => seq('{/', 'if', '}'),
    _if_alternative: $ => choice(
      $.elseif_block,
      $.else_block,
    ),
    elseif_block: $ => prec(3, seq(
      $.elseif_tag,
      field('body', alias(repeat($._smarty), $.body)),
      field('alternative', optional($._if_alternative)),
    )),
    elseif_tag: $ => seq(
      '{',
      choice('elseif', seq('else', 'if')),
      field('condition', $._expression),
      '}',
    ),
    else_block: $ => seq(
      $.else_tag,
      field('body', alias(repeat($._smarty), $.body)),
    ),
    else_tag: _ => seq('{', 'else', '}'),

    for_block: $ => seq(
      $.for_start_tag,
      field('body', alias(repeat($._smarty), $.body)),
      field('alternative', optional($.forelse_block)),
      $.for_end_tag,
    ),
    for_start_tag: $ => prec(1, seq(
      '{',
      'for',
      field('start', $.assignment_expression),
      'to',
      field('end', $._expression),
      optional(field('step', $._expression)),
      alias(repeat($.tag_function_attribute), $.tag_function_attributes),
      '}'
    )),
    for_end_tag: _ => seq('{/', 'for', '}'),
    forelse_block: $ => seq(
      $.forelse_tag,
      field('body', alias(repeat($._smarty), $.body)),
    ),
    forelse_tag: _ => seq('{', 'forelse', '}'),

    foreach_block: $ => seq(
      $.foreach_start_tag,
      field('body', alias(repeat($._smarty), $.body)),
      field('alternative', optional($.foreachelse_block)),
      $.foreach_end_tag,
    ),
    foreach_start_tag: $ => prec(1, seq(
      '{',
      'foreach',
      choice(
        seq(
          field('from', $._expression),
          'as',
          optional(seq(
            field('key', $.variable),
            '=>'
          )),
          field('item', $.variable),
        ),
        // Old (deprecated?) smarty 2 notation.
        alias(repeat($.tag_function_attribute), $.tag_function_attributes),
      ),
      '}',
    )),
    foreach_end_tag: _ => seq('{/', 'foreach', '}'),
    foreachelse_tag: _ => seq('{', 'foreachelse', '}'),
    foreachelse_block: $ => seq(
      $.foreachelse_tag,
      field('body', alias(repeat($._smarty), $.body)),
    ),

    literal_block: $ => seq(
      $.literal_start_tag,
      field('body', alias(optional($.literal_body), $.body)),
      $.literal_end_tag,
    ),
    literal_start_tag: _ => seq('{', 'literal', '}'),
    literal_end_tag: _ => seq('{/', 'literal', '}'),
    literal_body: $ => alias(
      repeat1(choice(
        /[^\{]+/,
        // This seems excessive, but without a scanner this is the best I can to
        // right now? I guess this is fine.
        token.immediate(/\{[^/]/),
        token.immediate(/\{\/[^l]/),
        token.immediate(/\{\/l[^i]/),
        token.immediate(/\{\/li[^t]/),
        token.immediate(/\{\/lit[^e]/),
        token.immediate(/\{\/lite[^r]/),
        token.immediate(/\{\/liter[^a]/),
        token.immediate(/\{\/litera[^l]/),
        token.immediate(/\{\/literal[^\}]/),
      )),
      $.text,
    ),

    section_block: $ => seq(
      $.section_start_tag,
      field('body', alias(repeat($._smarty), $.body)),
      field('alternative', optional($.sectionelse_block)),
      $.section_end_tag,
    ),
    section_start_tag: $ => prec(1, seq(
      '{',
      'section',
      alias(repeat($.tag_function_attribute), $.tag_function_attributes),
      '}',
    )),
    section_end_tag: _ => seq('{/', 'section', '}'),
    sectionelse_block: $ => seq(
      $.sectionelse_tag,
      field('body', alias(repeat($._smarty), $.body)),
    ),
    sectionelse_tag: _ => seq('{', 'sectionelse', '}'),

    while_block: $ => seq(
      $.while_start_tag,
      field('body', alias(repeat($._smarty), $.body)),
      $.while_end_tag,
    ),
    while_start_tag: $ => prec(1, seq(
      '{',
      'while',
      field('condition', $._expression),
      '}',
    )),
    while_end_tag: _ => seq('{/', 'while', '}'),

    // Expressions

    _expression: $ => prec.right(choice(
      $._literal,
      // Simple tags can be used in tags/expressions.
      $.tag,
      $._access_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.parenthesized_expression,

      prec.right($.modifier_call_expression),
      $.function_call_expression,
    )),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    unary_expression: $ => prec.left(1, choice(
      // FIXME: Disallow extras between nodes.
      seq(choice('++', '--'), $.variable),
      // FIXME: Disallow extras between nodes.
      seq($.variable, choice('++', '--')),
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
        '%',
        '**',

        '==',
        '!=',
        '<>',
        '>',
        '<',
        '>=',
        '<=',
        '===',
        '!==',

        '??',
        '?:',

        'and',
        'xor',
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

    // Modifier called in a modifier pipeline.
    // TODO: {tag_function|json_encode attr='foo' flag}
    modifier_call_expression: $ => prec.right(seq(
      field('input', $._expression),
      '|',
      field('name', $.identifier),
      field('arguments', optional(alias($.modifier_arguments, $.arguments))),
    )),
    // Modifier called as a function.
    function_call_expression: $ => prec(1, seq(
      field('name', $.identifier),
      field('arguments', alias($.parenthesized_arguments, $.arguments)),
    )),

    parenthesized_arguments: $ => seq(
      '(',
      optional(seq($.argument, repeat(seq(',', $.argument)))),
      ')',
    ),
    modifier_arguments: $ => prec.right(repeat1(seq(':', $.argument))),
    argument: $ => $._expression,

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

    member_access_expression: $ => prec.right(1, seq(
      field('object', $._access_expression),
      '->',
      field('name', choice($.variable, $.identifier)),
    )),
    member_call_expression: $ => prec.right(1, seq(
      field('object', $._access_expression),
      '->',
      field('name', $.identifier),
      field('arguments', alias($.parenthesized_arguments, $.arguments)),
    )),
    smarty_access_expression: $ => prec(1, seq(
      field('array', $._access_expression),
      '.',
      field('name', choice($.variable, $.identifier)),
    )),
    section_access_expression: $ => seq(
      field('array', $.variable),
      token.immediate('['),
      field('name', $.identifier),
      ']',
    ),
    // TODO: add subscript fields.
    array_access_expression: $ => prec(1, seq(
      $._access_expression,
      token.immediate('['),
      $._expression,
      ']',
    )),

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
          alias(/\\[\\']/, $.escape_sequence),
          alias(
            prec.right(repeat1(token.immediate(prec(1, /[^'\\]+/)))),
            $.string_content,
          ),
        )),
        '\'',
      ),
      seq(
        '"',
        repeat(choice(
          alias(REGEX_ESC, $.escape_sequence),
          alias(
            prec.right(repeat1(token.immediate(prec(1, /[^"\\]+/)))),
            $.string_content,
          ),
        )),
        '"',
      ),
    ),

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

/**
 * @param {RuleOrLiteral} name
 * @param {RuleOrLiteral[]} rules
 *
 * @returns {SeqRule}
 */
function smartyBuiltinTag(name, ...rules) {
  return seq('{', name, ...rules, '}')
}

/**
 * @param {RuleOrLiteral} name
 *
 * @returns {SeqRule}
 */
function smartyBuiltinEndTag(name) {
  return seq('{/', token.immediate(name), '}');
}
