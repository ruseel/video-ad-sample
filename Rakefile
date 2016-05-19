task :simple_http_server do
  Dir.chdir "public" do
    system "python -m SimpleHTTPServer"
  end
end

task :ngrok do
  system "~/bin/ngrok http 8000"
end
