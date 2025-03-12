package tree_sitter_smarty_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_smarty "github.com/hex-cat-man/tree-sitter-smarty/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_smarty.Language())
	if language == nil {
		t.Errorf("Error loading Smarty grammar")
	}
}
