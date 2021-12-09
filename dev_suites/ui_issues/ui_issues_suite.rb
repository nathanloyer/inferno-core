module UIIssues # rubocop:disable Naming/ClassAndModuleCamelCase
  class Suite < Inferno::TestSuite
    title 'UI Issues'
    id :ui_issues

    group do
      title 'This Group defines an output'
      test do
        output :default_value_input
      end
    end

    group do
      title 'PROBLEM: This Group defines inputs with default values'

      test do
        title 'This test has two inputs with default values'
        input :default_value_input,
              description: 'The group before this defines this as an output, and as a result no default value is displayed here',
              default: 'THIS VALUE DOES NOT APPEAR'
        input :default_value_input2,
              default: 'THIS VALUE DOES APPEAR'
      end
    end
  end
end
