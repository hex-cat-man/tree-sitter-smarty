[ "{" "}" "{/" ] @punctuation.bracket

[ "[" "]" ] @punctuation.bracket

[ "=" "=>" ] @operator

(tag_function_name) @tag

(comment) @comment

(tag_function_attribute
  name: (identifier) @attribute)

(null) @type.builtin
(boolean) @boolean
(number) @number
(string) @string
(escape_sequence) @string.escape
