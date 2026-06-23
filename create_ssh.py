import paramiko

HOST = '10.30.50.29'
USER = 'vmadmin'
PASS = 'Poptech@123!'
WORKDIR = '/opt/apps/seeding_markeeai/scraper-linkedin'
CRAWLER = WORKDIR + '/linkedin_group_crawler'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    stdin, stdout, stderr = client.exec_command('find ' + CRAWLER + ' -name *.py', timeout=60)
    print(stdout.read().decode('utf-8', errors='replace'))
    print(stderr.read().decode('utf-8', errors='replace'))
finally:
    client.close()