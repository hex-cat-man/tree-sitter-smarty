["{" "}" "{/"] @punctuation.bracket

["[" "]" "(" ")"] @punctuation.bracket

[","] @punctuation.delimiter

["=" "=>" "->" "."] @operator

[
  "+"
  "-"
  "*"
  "/"
  "=="
  "!="
  ">"
  "<"
  ">="
  "<="
  "==="
  "%"
  "??"
  "?:"
] @operator

(ternary_expression ["?" ":"] @operator)

[
 "and"
 "by"
 "div"
 "eq"
 "even"
 "ge"
 "gt"
 "gte"
 "in"
 "is"
 "le"
 "lt"
 "lte"
 "mod"
 "ne"
 "neq"
 "not"
 "odd"
 "or"
] @keyword

(tag_function_name) @tag

(comment) @comment

(tag_function_attribute
  name: (identifier) @attribute)

(variable) @variable
(variable "$" @keyword)
(config_variable "#" @keyword)

(variable
  (identifier) @variable.builtin
  (#any-of? @variable.builtin "smarty"))

(variable_property
  property: (identifier) @variable.builtin
    (#any-of? @variable.builtin "index" "iteration" "first" "last" "show" "total"))
(variable_property "@" @operator)

(member_access_expression
  name: (identifier) @property)
(member_call_expression
  name: (identifier) @function)
(section_access_expression
  name: (identifier) @property)
(smarty_access_expression
  name: (identifier) @property)
(smarty_access_expression
  array: (smarty_access_expression
    array: (variable
      (identifier) @variable.builtin ( #eq? @variable.builtin "smarty"))
    name: (identifier) @property (#eq? @property "const"))
  name: (identifier) @constant)

(null) @type.builtin
(boolean) @boolean
(number) @number
(string) @string
(escape_sequence) @string.escape
