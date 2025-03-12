import XCTest
import SwiftTreeSitter
import TreeSitterSmarty

final class TreeSitterSmartyTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_smarty())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Smarty grammar")
    }
}
