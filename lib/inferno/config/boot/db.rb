require 'sequel'

Inferno::Application.boot(:db) do
  init do
    use :logging

    require 'yaml'

    Sequel::Model.plugin :json_serializer

    config_path = File.expand_path('database.yml', File.join(Dir.pwd, 'config'))
    config = YAML.load_file(config_path)[ENV['APP_ENV']]
               .merge(logger: Inferno::Application['logger'])
    connection = nil
    5.times do |i|
      begin
        connection = Sequel.connect(config)
        break
      rescue StardardError => e
        Inferno::Application['logger'].error(e.full_message)
        Inferno::Application['logger'].error("Failed to connect to the database #{i + 1}/5")
        sleep (i + 1) * 2
      end
    end
    connection.sql_log_level = :debug

    register('db.config', config)
    register('db.connection', connection)
  end

  start do
    Sequel.extension :migration
  end
end
