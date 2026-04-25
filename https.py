import http.server, ssl

server_address = ('localhost', 8443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

httpd.context = ssl.Context(certfile='certs/web.crt', 
                            keyfile='certs/web.key')

httpd.socket = ssl.wrap_socket(httpd.socket, 
                               server_side=True,
                               ssl_version=ssl.PROTOCOL_TLS)
httpd.serve_forever()
