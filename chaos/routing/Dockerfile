FROM debian:10

# configure ssh
RUN apt-get update
RUN apt-get install -y openssh-server
RUN mkdir /var/run/sshd
RUN echo 'root:crylicadmin' | chpasswd
RUN sed -i 's/#*PermitRootLogin prohibit-password/PermitRootLogin yes/g' /etc/ssh/sshd_config
RUN sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd

# run the ssh server on start
ENTRYPOINT ["/usr/sbin/sshd", "-D"]
