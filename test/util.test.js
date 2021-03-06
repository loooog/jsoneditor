var assert = require('assert');
var util = require('../src/js/util');

describe('util', function () {

  describe('sanitize', function () {

    it('should leave valid JSON as is', function () {
      assert.equal(util.sanitize('{"a":2}'), '{"a":2}');
    });

    it('should replace JavaScript with JSON', function () {
      assert.equal(util.sanitize('{a:2}'), '{"a":2}');
      assert.equal(util.sanitize('{a: 2}'), '{"a": 2}');
      assert.equal(util.sanitize('{\n  a: 2\n}'), '{\n  "a": 2\n}');
      assert.equal(util.sanitize('{\'a\':2}'), '{"a":2}');
      assert.equal(util.sanitize('{a:\'foo\'}'), '{"a":"foo"}');
      assert.equal(util.sanitize('{a:\'foo\',b:\'bar\'}'), '{"a":"foo","b":"bar"}');

      // should leave string content untouched
      assert.equal(util.sanitize('"{a:b}"'), '"{a:b}"');
    });

    it('should add/remove escape characters', function () {
      assert.equal(util.sanitize('"foo\'bar"'), '"foo\'bar"');
      assert.equal(util.sanitize('"foo\\"bar"'), '"foo\\"bar"');
      assert.equal(util.sanitize('\'foo"bar\''), '"foo\\"bar"');
      assert.equal(util.sanitize('\'foo\\\'bar\''), '"foo\'bar"');
      assert.equal(util.sanitize('"foo\\\'bar"'), '"foo\'bar"');
    });

    it('should replace special white characters', function () {
      assert.equal(util.sanitize('{"a":\u00a0"foo\u00a0bar"}'), '{"a": "foo\u00a0bar"}');
      assert.equal(util.sanitize('{"a":\u2009"foo"}'), '{"a": "foo"}');
    });

    it('should escape unescaped control characters', function () {
      assert.equal(util.sanitize('"hello\bworld"'), '"hello\\bworld"')
      assert.equal(util.sanitize('"hello\fworld"'), '"hello\\fworld"')
      assert.equal(util.sanitize('"hello\nworld"'), '"hello\\nworld"')
      assert.equal(util.sanitize('"hello\rworld"'), '"hello\\rworld"')
      assert.equal(util.sanitize('"hello\tworld"'), '"hello\\tworld"')
      assert.equal(util.sanitize('{"value\n": "dc=hcm,dc=com"}'), '{"value\\n": "dc=hcm,dc=com"}')
    })

    it('should replace left/right quotes', function () {
      assert.equal(util.sanitize('\u2018foo\u2019'), '"foo"')
      assert.equal(util.sanitize('\u201Cfoo\u201D'), '"foo"')
      assert.equal(util.sanitize('\u0060foo\u00B4'), '"foo"')
    });

    it('remove comments', function () {
      assert.equal(util.sanitize('/* foo */ {}'), ' {}');
      assert.equal(util.sanitize('/* foo */ {}'), ' {}');
      assert.equal(util.sanitize('{a:\'foo\',/*hello*/b:\'bar\'}'), '{"a":"foo","b":"bar"}');
      assert.equal(util.sanitize('{\na:\'foo\',//hello\nb:\'bar\'\n}'), '{\n"a":"foo",\n"b":"bar"\n}');

      // should not remove comments in string
      assert.equal(util.sanitize('{"str":"/* foo */"}'), '{"str":"/* foo */"}');
    });

    it('should strip JSONP notation', function () {
      // matching
      assert.equal(util.sanitize('callback_123({});'), '{}');
      assert.equal(util.sanitize('callback_123([]);'), '[]');
      assert.equal(util.sanitize('callback_123(2);'), '2');
      assert.equal(util.sanitize('callback_123("foo");'), '"foo"');
      assert.equal(util.sanitize('callback_123(null);'), 'null');
      assert.equal(util.sanitize('callback_123(true);'), 'true');
      assert.equal(util.sanitize('callback_123(false);'), 'false');
      assert.equal(util.sanitize('/* foo bar */ callback_123 ({})'), '{}');
      assert.equal(util.sanitize('/* foo bar */ callback_123 ({})'), '{}');
      assert.equal(util.sanitize('/* foo bar */\ncallback_123({})'), '{}');
      assert.equal(util.sanitize('/* foo bar */ callback_123 (  {}  )'), '  {}  ');
      assert.equal(util.sanitize('  /* foo bar */   callback_123 ({});  '), '{}');
      assert.equal(util.sanitize('\n/* foo\nbar */\ncallback_123 ({});\n\n'), '{}');

      // non-matching
      assert.equal(util.sanitize('callback abc({});'), 'callback abc({});');
      assert.equal(util.sanitize('callback {}'), 'callback {}');
      assert.equal(util.sanitize('callback({}'), 'callback({}');
    });

    it('should strip trailing zeros', function () {
      // matching
      assert.equal(util.sanitize('[1,2,3,]'), '[1,2,3]');
      assert.equal(util.sanitize('[1,2,3,\n]'), '[1,2,3\n]');
      assert.equal(util.sanitize('[1,2,3,  \n  ]'), '[1,2,3  \n  ]');
      assert.equal(util.sanitize('{"a":2,}'), '{"a":2}');

      // not matching
      assert.equal(util.sanitize('"[1,2,3,]"'), '"[1,2,3,]"');
      assert.equal(util.sanitize('"{a:2,}"'), '"{a:2,}"');
    });

  });

  describe('jsonPath', function () {

    it('should stringify an array of paths', function() {
      assert.deepStrictEqual(util.stringifyPath([]), '');
      assert.deepStrictEqual(util.stringifyPath(['foo']), '.foo');
      assert.deepStrictEqual(util.stringifyPath(['foo', 'bar']), '.foo.bar');
      assert.deepStrictEqual(util.stringifyPath(['foo', 2]), '.foo[2]');
      assert.deepStrictEqual(util.stringifyPath(['foo', 2, 'bar']), '.foo[2].bar');
      assert.deepStrictEqual(util.stringifyPath(['foo', 2, 'bar_baz']), '.foo[2].bar_baz');
      assert.deepStrictEqual(util.stringifyPath(['foo', 'prop-with-hyphens']), '.foo["prop-with-hyphens"]');
      assert.deepStrictEqual(util.stringifyPath(['foo', 'prop with spaces']), '.foo["prop with spaces"]');
    })

    it ('should parse a json path', function () {
      assert.deepStrictEqual(util.parsePath(''), []);
      assert.deepStrictEqual(util.parsePath('.foo'), ['foo']);
      assert.deepStrictEqual(util.parsePath('.foo.bar'), ['foo', 'bar']);
      assert.deepStrictEqual(util.parsePath('.foo[2]'), ['foo', 2]);
      assert.deepStrictEqual(util.parsePath('.foo[2].bar'), ['foo', 2, 'bar']);
      assert.deepStrictEqual(util.parsePath('.foo["prop with spaces"]'), ['foo', 'prop with spaces']);
      assert.deepStrictEqual(util.parsePath('.foo[\'prop with single quotes as outputted by ajv library\']'), ['foo', 'prop with single quotes as outputted by ajv library']);
      assert.deepStrictEqual(util.parsePath('.foo["prop with . dot"]'), ['foo', 'prop with . dot']);
      assert.deepStrictEqual(util.parsePath('.foo["prop with ] character"]'), ['foo', 'prop with ] character']);
      assert.deepStrictEqual(util.parsePath('.foo[*].bar'), ['foo', '*', 'bar']);
    });

    it ('should throw an exception in case of an invalid path', function () {
      assert.throws(function () {util.parsePath('.')}, /Invalid JSON path: property name expected at index 1/);
      assert.throws(function () {util.parsePath('[')}, /Invalid JSON path: unexpected character "\[" at index 0/);
      assert.throws(function () {util.parsePath('[]')}, /Invalid JSON path: unexpected character "\[" at index 0/);
      assert.throws(function () {util.parsePath('.foo[  ]')}, /Invalid JSON path: array value expected at index 7/);
      assert.throws(function () {util.parsePath('.[]')}, /Invalid JSON path: property name expected at index 1/);
      assert.throws(function () {util.parsePath('["23]')}, /Invalid JSON path: unexpected character "\[" at index 0/);
      assert.throws(function () {util.parsePath('.foo bar')}, /Invalid JSON path: unexpected character " " at index 4/);
    });

  });

  describe('getIndexForPosition', function () {
    var el = {
      value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    };

    it('happy flows - row and column in range', function () {
      assert.equal(util.getIndexForPosition(el, 1, 1), 0);
      assert.equal(util.getIndexForPosition(el, 2, 1), 124);
      assert.equal(util.getIndexForPosition(el, 3, 8), 239);
      assert.equal(util.getIndexForPosition(el, 4, 22), 356);
    });

    it('if range exceeds it should be considered as if it is last row or column length', function () {
      assert.equal(util.getIndexForPosition(el, 1, 100000), 123);
      assert.equal(util.getIndexForPosition(el, 100000, 1), 335);
      assert.equal(util.getIndexForPosition(el, 100000, 100000), 445);
    });

    it('missing or wrong input sould return -1', function () {
      assert.equal(util.getIndexForPosition(el), -1);
      assert.equal(util.getIndexForPosition(el, undefined, 1), -1);
      assert.equal(util.getIndexForPosition(el, 1, undefined), -1);
      assert.equal(util.getIndexForPosition(el, -2, -2), -1);
    });

  })
  describe('makeFieldTooltip', function () {
    it('should return empty string when the schema is missing all relevant fields', function () {
      assert.strictEqual(util.makeFieldTooltip({}), '')
      assert.strictEqual(util.makeFieldTooltip({additionalProperties: false}), '')
      assert.strictEqual(util.makeFieldTooltip(), '')
    });
  
    it('should make tooltips with only title', function () {
      assert.strictEqual(util.makeFieldTooltip({title: 'foo'}), 'foo');
    });

    it('should make tooltips with only description', function () {
      assert.strictEqual(util.makeFieldTooltip({description: 'foo'}), 'foo');
    });

    it('should make tooltips with only default', function () {
      assert.strictEqual(util.makeFieldTooltip({default: 'foo'}), 'Default\n"foo"');
    });

    it('should make tooltips with only examples', function () {
      assert.strictEqual(util.makeFieldTooltip({examples: ['foo', 'bar']}), 'Examples\n"foo"\n"bar"');
    });

    it('should make tooltips with title and description', function () {
      assert.strictEqual(util.makeFieldTooltip({title: 'foo', description: 'bar'}), 'foo\nbar');

      var longTitle = 'Lorem Ipsum Dolor';
      var longDescription = 'Duis id elit non ante gravida vestibulum non nec est. ' +
        'Proin vitae ligula at elit dapibus tempor. ' +
        'Etiam lacinia augue vel condimentum interdum. ';
      assert.strictEqual(
        util.makeFieldTooltip({title: longTitle, description: longDescription}),
        longTitle + '\n' + longDescription
      );
    });

    it('should make tooltips with title, description, and examples', function () {
      assert.strictEqual(
        util.makeFieldTooltip({title: 'foo', description: 'bar', examples: ['baz']}),
        'foo\nbar\n\nExamples\n"baz"',
      );
    });

    it('should make tooltips with title, description, default, and examples', function () {
      assert.strictEqual(
        util.makeFieldTooltip({title: 'foo', description: 'bar', default: 'bat', examples: ['baz']}),
        'foo\nbar\n\nDefault\n"bat"\n\nExamples\n"baz"',
      );
    });

    it('should handle empty fields', function () {
      assert.strictEqual(util.makeFieldTooltip({title: '', description: 'bar'}), 'bar');
      assert.strictEqual(util.makeFieldTooltip({title: 'foo', description: ''}), 'foo');
      assert.strictEqual(util.makeFieldTooltip({description: 'bar', examples: []}), 'bar');
      assert.strictEqual(util.makeFieldTooltip({description: 'bar', examples: ['']}), 'bar\n\nExamples\n""');
    });

    it('should internationalize "Defaults" correctly', function () {
      assert.strictEqual(util.makeFieldTooltip({default: 'foo'}, 'pt-BR'), 'Revelia\n"foo"');
    });

    it('should internationalize "Examples" correctly', function () {
      assert.strictEqual(util.makeFieldTooltip({examples: ['foo']}, 'pt-BR'), 'Exemplos\n"foo"');
    });
  });
  // TODO: thoroughly test all util methods
});