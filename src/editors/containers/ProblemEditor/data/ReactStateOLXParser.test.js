import { OLXParser } from './OLXParser';
import {
  checkboxesOLXWithFeedbackAndHintsOLX,
  dropdownOLXWithFeedbackAndHintsOLX,
  numericInputWithFeedbackAndHintsOLX,
  numericInputWithAnswerRangeOLX,
  textInputWithFeedbackAndHintsOLX,
  multipleChoiceWithFeedbackAndHintsOLX,
  textInputWithFeedbackAndHintsOLXWithMultipleAnswers,
  numberParseTestOLX,
} from './mockData/olxTestData';
import {
  checkboxesWithFeedbackAndHints,
  dropdownWithFeedbackAndHints,
  textInputWithFeedbackAndHints,
  multipleChoiceWithFeedbackAndHints,
  numericInputWithFeedbackAndHints,
  numericInputWithAnswerRange,
  textInputWithFeedbackAndHintsWithMultipleAnswers,
  numberParseTest,
  numericInputWithFractionBounds,
  numericInputWithEmptyUpperBound,
  numericInputWithSwappedBounds,
  numericInputWithMissingLowerBound,
  numericInputWithNegativeBounds,
  numericInputWithSameBounds,
} from './mockData/editorTestData';
import ReactStateOLXParser from './ReactStateOLXParser';

describe('Check React State OLXParser problem', () => {
  test('for checkbox with feedback and hints problem type', () => {
    const olxparser = new OLXParser(checkboxesOLXWithFeedbackAndHintsOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: checkboxesWithFeedbackAndHints,
    });
    const buildOLX = stateParser.buildOLX();
    expect(buildOLX.replace(/\s/g, '')).toBe(checkboxesOLXWithFeedbackAndHintsOLX.buildOLX.replace(/\s/g, ''));
  });
  test('Test dropdown with feedback and hints problem type', () => {
    const olxparser = new OLXParser(dropdownOLXWithFeedbackAndHintsOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: dropdownWithFeedbackAndHints,
    });
    const buildOLX = stateParser.buildOLX();
    expect(buildOLX.replace(/\s/g, '')).toEqual(dropdownOLXWithFeedbackAndHintsOLX.buildOLX.replace(/\s/g, ''));
  });
  test('Test string response with feedback and hints problem type', () => {
    const olxparser = new OLXParser(textInputWithFeedbackAndHintsOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: textInputWithFeedbackAndHints,
    });
    const buildOLX = stateParser.buildOLX();
    expect(buildOLX.replace(/\s/g, '')).toEqual(textInputWithFeedbackAndHintsOLX.buildOLX.replace(/\s/g, ''));
  });
  describe('Multiple choice with feedback and hints problem type', () => {
    const olxparser = new OLXParser(multipleChoiceWithFeedbackAndHintsOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: multipleChoiceWithFeedbackAndHints,
    });

    it('should parse correctly', () => {
      const buildOLX = stateParser.buildOLX();
      expect(buildOLX.replace(/\s/g, '')).toEqual(multipleChoiceWithFeedbackAndHintsOLX.buildOLX.replace(/\s/g, ''));
    });
  });

  describe('with label and em tag wrapped in div: ', () => {
    const olxparser = new OLXParser(multipleChoiceWithFeedbackAndHintsOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: multipleChoiceWithFeedbackAndHints,
    });
    stateParser.editorObject.question =
      '<p>You can use this template as a guide to the simple editor markdown and OLX markup to use for multiple choice with hints and feedback problems. Edit this component to replace this template with your own assessment.</p>\n<div><label>Add the question text, or prompt, here. This text is required.</label> <em class="olx_description">You can add an optional tip or note related to the prompt like this. </em><em>Just a generic em tag</em></div>';

    it('parser should not delete <em> tags', () => {
      const buildOLX = stateParser.buildOLX();
      expect(buildOLX.replace(/\s/g, '')).toEqual(multipleChoiceWithFeedbackAndHintsOLX.buildOLX.replace(/\s/g, ''));
    });

    it('addQuestion method should add a question to the problemState correctly', () => {
      const received = stateParser.addQuestion();
      expect(received).toEqual(
        [
          {
            p: [{
              '#text':
                'You can use this template as a guide to the simple editor markdown and OLX markup to use for multiple choice with hints and feedback problems. Edit this component to replace this template with your own assessment.',
            }],
          },
          { label: [{ '#text': 'Add the question text, or prompt, here. This text is required.' }] },
          { '#text': ' ' },
          {
            em: [{ '#text': 'You can add an optional tip or note related to the prompt like this. ' }],
            ':@': { '@_class': 'olx_description' },
          },
          { em: [{ '#text': 'Just a generic em tag' }] },
        ],
      );
    });
  });

  test('Test numerical response with feedback and hints problem type', () => {
    const olxparser = new OLXParser(numericInputWithFeedbackAndHintsOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: numericInputWithFeedbackAndHints,
    });
    const buildOLX = stateParser.buildOLX();
    expect(buildOLX.replace(/\s/g, '')).toEqual(numericInputWithFeedbackAndHintsOLX.buildOLX.replace(/\s/g, ''));
  });

  test('Test numerical response with isAnswerRange true', () => {
    const olxparser = new OLXParser(numericInputWithAnswerRangeOLX.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: numericInputWithAnswerRange,
    });
    const buildOLX = stateParser.buildOLX();
    expect(buildOLX.replace(/\s/g, '')).toEqual(numericInputWithAnswerRangeOLX.buildOLX.replace(/\s/g, ''));
  });
  test('Test string response with feedback and hints, multiple answers', () => {
    const olxparser = new OLXParser(textInputWithFeedbackAndHintsOLXWithMultipleAnswers.rawOLX);
    const problem = olxparser.getParsedOLXData();
    const stateParser = new ReactStateOLXParser({
      problem,
      editorObject: textInputWithFeedbackAndHintsWithMultipleAnswers,
    });
    const buildOLX = stateParser.buildOLX();
    expect(buildOLX.replace(/\s/g, '')).toEqual(
      textInputWithFeedbackAndHintsOLXWithMultipleAnswers.buildOLX.replace(/\s/g, ''),
    );
  });
  describe('encode/decode', () => {
    test('does not change hex values to dec and does not remove leading 0s', () => {
      const olxparser = new OLXParser(numberParseTestOLX.rawOLX);
      const problem = olxparser.getParsedOLXData();
      const stateParser = new ReactStateOLXParser({
        problem,
        editorObject: numberParseTest,
      });
      const buildOLX = stateParser.buildOLX();
      expect(buildOLX.replace(/\s/g, '')).toEqual(numberParseTestOLX.buildOLX.replace(/\s/g, ''));
    });
    test('correctly preserves whitespace inside pre tags', () => {
      const stateParser = new ReactStateOLXParser({
        problem: { problemType: 'optionresponse', answers: [] },
        editorObject: { question: '<pre>  1  a<br />  2  b<br /></pre>', hints: [] },
      });
      const buildOLX = stateParser.buildOLX();
      expect(buildOLX).toEqual(
        '<problem><optionresponse>\n<pre>  1  a<br/>  2  b<br/></pre><optioninput></optioninput></optionresponse>\n</problem>',
      );
    });
  });
  describe('ReactStateOLXParser numerical response range parsing', () => {
    test('handles empty upper bound as same as lower', () => {
      const parser = new ReactStateOLXParser({
        problem: numericInputWithEmptyUpperBound,
        editorObject: numericInputWithEmptyUpperBound,
      });
      const result = parser.buildNumericalResponse();
      expect(result[':@']['@_answer']).toBe('[0,1.5]');
    });

    test('handles swapped bounds and corrects order', () => {
      const parser = new ReactStateOLXParser({
        problem: numericInputWithSwappedBounds,
        editorObject: numericInputWithSwappedBounds,
      });
      const result = parser.buildNumericalResponse();
      expect(result[':@']['@_answer']).toBe('[2,5]');
    });

    test('fixes swapped fraction bounds and preserves brackets', () => {
      const parser = new ReactStateOLXParser({
        problem: numericInputWithFractionBounds,
        editorObject: numericInputWithFractionBounds,
      });
      const result = parser.buildNumericalResponse();
      expect(result[':@']['@_answer']).toBe('(1/2,3/2)');
    });

    test('sets upper bound = lower bound if upper bound missing', () => {
      const parser = new ReactStateOLXParser({
        problem: numericInputWithMissingLowerBound,
        editorObject: numericInputWithMissingLowerBound,
      });
      const result = parser.buildNumericalResponse();
      expect(result[':@']['@_answer']).toBe('[,2.5]');
    });

    test('handles negative number ranges correctly', () => {
      const parser = new ReactStateOLXParser({
        problem: numericInputWithNegativeBounds,
        editorObject: numericInputWithNegativeBounds,
      });

      const result = parser.buildNumericalResponse();
      expect(result[':@']['@_answer']).toBe('(-5.5,-1)');
    });

    test('handles same numbers in ranges correctly', () => {
      const parser = new ReactStateOLXParser({
        problem: numericInputWithSameBounds,
        editorObject: numericInputWithSameBounds,
      });

      const result = parser.buildNumericalResponse();
      expect(result[':@']['@_answer']).toBe('[10,10]');
    });
  });
});

// Uber: the placeholder setting round-trips through the input's placeholder attribute.
describe('placeholder attribute', () => {
  const cases = [
    [
      'dropdown',
      dropdownOLXWithFeedbackAndHintsOLX,
      dropdownWithFeedbackAndHints,
      '<optioninput>',
      '<optioninput placeholder="Choose &amp; pick">',
    ],
    [
      'text input',
      textInputWithFeedbackAndHintsOLX,
      textInputWithFeedbackAndHints,
      '<textline size="20"/>',
      '<textline size="20" placeholder="Choose &amp; pick"/>',
    ],
    [
      'numeric input',
      numericInputWithFeedbackAndHintsOLX,
      numericInputWithFeedbackAndHints,
      '<formulaequationinput/>',
      '<formulaequationinput placeholder="Choose &amp; pick"/>',
    ],
  ];

  test.each(cases)('%s keeps the placeholder', (name, olx, editorObject, tag, tagWithPlaceholder) => {
    const problem = new OLXParser(olx.rawOLX.replace(tag, tagWithPlaceholder)).getParsedOLXData();
    expect(problem.settings.placeholder).toBe('Choose & pick');
    const built = new ReactStateOLXParser({ problem, editorObject }).buildOLX();
    expect(built).toContain('placeholder="Choose &amp; pick"');
  });

  test.each(cases)('%s decodes numeric references instead of encoding them twice', (name, olx, editorObject, tag) => {
    const withRefs = tag.replace(/(\/?>)$/, ' placeholder="caf&#233; &#x2014;"$1');
    const problem = new OLXParser(olx.rawOLX.replace(tag, withRefs)).getParsedOLXData();
    expect(problem.settings.placeholder).toBe('café —');
    const built = new ReactStateOLXParser({ problem, editorObject }).buildOLX();
    expect(built).toContain('placeholder="café —"');
    expect(built).not.toContain('&amp;#');
  });

  test.each(cases)('%s writes no placeholder when it is blank', (name, olx, editorObject) => {
    const problem = new OLXParser(olx.rawOLX).getParsedOLXData();
    expect(problem.settings.placeholder).toBe('');
    const built = new ReactStateOLXParser({
      problem: { ...problem, settings: { ...problem.settings, placeholder: '  ' } },
      editorObject,
    }).buildOLX();
    expect(built).not.toContain('placeholder=');
  });

  test('a single select problem writes no placeholder', () => {
    const problem = new OLXParser(multipleChoiceWithFeedbackAndHintsOLX.rawOLX).getParsedOLXData();
    const built = new ReactStateOLXParser({
      problem: { ...problem, settings: { ...problem.settings, placeholder: 'Left over from a dropdown' } },
      editorObject: multipleChoiceWithFeedbackAndHints,
    }).buildOLX();
    expect(built).not.toContain('placeholder=');
  });
});
