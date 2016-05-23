task :simple_http_server do
  Dir.chdir "public" do
    Thread.new do 
      system "python -m SimpleHTTPServer"
    end
  end
end

task :ngrok => [:simple_http_server] do
  system "~/bin/ngrok http 8000"
end
