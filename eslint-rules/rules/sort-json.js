export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Ensure JSON array is sorted by 'label' key",
    },
    fixable: "code",
    schema: [], // no options
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    function getLabelValue(objNode) {
      const labelProp = objNode.properties.find(
        (p) =>
          p.key.type === "Literal" &&
          p.key.value === "label" &&
          p.value.type === "Literal",
      );
      return labelProp ? labelProp.value.value : null;
    }

    return {
      ArrayExpression(node) {
        const elements = node.elements;
        if (!elements.every((el) => el.type === "ObjectExpression")) return;

        const sorted = [...elements].sort((a, b) => {
          const labelA = getLabelValue(a);
          const labelB = getLabelValue(b);
          return String(labelA).localeCompare(String(labelB), undefined, {
            numeric: true,
          });
        });

        for (let i = 0; i < elements.length; i++) {
          if (elements[i] !== sorted[i]) {
            context.report({
              node: elements[i],
              message: "Items should be sorted by 'label'",
              fix(fixer) {
                const sortedText = sorted
                  .map((el) => sourceCode.getText(el))
                  .join(", ");
                return fixer.replaceText(node, `[${sortedText}]`);
              },
            });
            break;
          }
        }
      },
    };
  },
};
