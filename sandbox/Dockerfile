FROM debian:12

# Base image with desktop environment and applications
# Environment variables:

ENV \
    # Avoid system prompts: \
    DEBIAN_FRONTEND=noninteractive \
    DEBIAN_PRIORITY=high \
    # Pip settings: \
    PIP_DEFAULT_TIMEOUT=100 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Desktop environment and applications (merged for smaller image size):

RUN apt-get update && \
    # Install all packages in one layer to reduce image size
    apt-get install -y \
        # X window server:
        xserver-xorg xorg x11-xserver-utils xvfb x11-utils xauth \
        # XFCE desktop environment:
        xfce4 xfce4-goodies \
        # Basic system utilities:
        util-linux sudo curl git \
        # Python pip:
        python3-pip \
        # Desktop SDK tools:
        xdotool scrot ffmpeg \
        # VNC and streaming:
        x11vnc net-tools netcat-openbsd \
        # Standard applications:
        x11-apps xpdf gedit xpaint tint2 galculator pcmanfm \
        # Dependencies for later installations:
        apt-transport-https ca-certificates gnupg \
        socat supervisor \
        xclip \
        wget software-properties-common \
        # Suna dependencies:
        poppler-utils wkhtmltopdf antiword unrtf catdoc gawk file jq csvkit xmlstarlet zip unzip tmux vim tree rsync && \
    # Configure X11 wrapper to allow any user:
    sed -i 's/allowed_users=console/allowed_users=anybody/' /etc/X11/Xwrapper.config && \
    # Set the default terminal
    ln -sf /usr/bin/xfce4-terminal.wrapper /etc/alternatives/x-terminal-emulator && \
    # Install Python packages:
    # apt-get install -y python3-numpy && \
    # Clone NoVNC and websockify:
    git clone -b e2b-desktop https://github.com/e2b-dev/noVNC.git /opt/noVNC && \
    ln -s /opt/noVNC/vnc.html /opt/noVNC/index.html && \
    git clone -b v0.12.0 https://github.com/novnc/websockify /opt/noVNC/utils/websockify && \
    # Clean up package cache and temporary files to reduce image size:
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /root/.cache

# Install LibreOffice from official website
ARG TARGETARCH
RUN case "$TARGETARCH" in \
        "amd64") LO_ARCH="x86_64" ;; \
        "arm64") LO_ARCH="aarch64" ;; \
        *) echo "Unsupported architecture: $TARGETARCH" && exit 1 ;; \
    esac && \
    case "$TARGETARCH" in \
        "amd64") LO_ARCH2="x86-64" ;; \
        "arm64") LO_ARCH2="aarch64" ;; \
        *) echo "Unsupported architecture: $TARGETARCH" && exit 1 ;; \
    esac && \
    wget -O /tmp/libreoffice.tar.gz "https://mirrors.ustc.edu.cn/tdf/libreoffice/stable/25.8.1/deb/${LO_ARCH}/LibreOffice_25.8.1_Linux_${LO_ARCH2}_deb.tar.gz" && \
    cd /tmp && \
    tar -xzf libreoffice.tar.gz && \
    cd LibreOffice_*/DEBS && \
    dpkg -i *.deb || true && \
    apt-get update && \
    apt-get install -f -y && \
    # Clean up
    rm -rf /tmp/LibreOffice_* /tmp/libreoffice.tar.gz && \
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/*


# User applications:

# ~ Make your changes to this template BELOW this line ~

# Install Chromium from Debian official repository (optimized single layer)
RUN apt-get update && \
    apt-get install -y chromium chromium-driver && \
    # Clean up package cache to reduce image size:
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Configure Chromium to skip first-run experience and enable CDP
RUN mkdir -p /etc/chromium/policies/managed/ && \
    echo '{"AllowInsecureLocalConnections": true, "RemoteDebuggingAllowed": true, "RemoteDebuggingPort": "9222", "RemoteDebuggingAddress":"0.0.0.0", "AutoplayAllowed": true, "MetricsReportingEnabled": false, "BrowserSignin": 0, "SyncDisabled": true, "PromotionalTabsEnabled": false, "DefaultBrowserSettingEnabled": false, "DefaultSearchProviderEnabled": false, "HideWebStoreIcon": true, "PasswordManagerEnabled": false, "PromptForDownloadLocation": false, "SafeBrowsingEnabled": false, "SafeBrowsingExtendedReportingEnabled": false, "UrlKeyedAnonymizedDataCollectionEnabled": false, "CloudPrintSubmitEnabled": false, "CloudManagementEnrollmentToken": "", "SpellcheckEnabled": false}' > /etc/chromium/policies/managed/policies.json

# Create user and configure Chrome (merged for smaller image size)
RUN apt-get update && \
    apt-get install -y gnome-keyring && \
    # Create default user
    useradd -ms /bin/bash user && \
    usermod -aG sudo user && \
    passwd -d user && \
    echo "user ALL=(ALL:ALL) NOPASSWD: ALL" >>/etc/sudoers && \
    # Create Chromium configuration directories
    mkdir -p /home/user/.config/chromium/Default/ && \
    echo '{  "browser": { "custom_chrome_frame": true, "has_seen_welcome_page": true }, "profile": { "default_content_setting_values": { "geolocation": 1 }, "exit_type": "Normal", "exited_cleanly": true, "password_manager_enabled": false } }' > /home/user/.config/chromium/Default/Preferences && \
    # Configure GNOME keyring and autostart
    mkdir -p /home/user/.local/share/keyrings && \
    touch /home/user/.local/share/keyrings/login.keyring && \
    mkdir -p /home/user/.config/autostart && \
    # Create Chromium data directory and set permissions
    mkdir -p /home/user/chromium-data && \
    chown -R user:user /home/user && \
    chmod -R 777 /home/user/chromium-data && \
    chmod 777 /home/user && \
    # Add Chromium aliases
    echo 'alias chromium="/usr/local/bin/chromium"' >> /home/user/.bashrc && \
    echo 'alias chrome="/usr/local/bin/chromium"' >> /home/user/.bashrc && \
    # Add VS Code alias
    echo 'alias code="code --no-sandbox"' >> /home/user/.bashrc && \
    chown -R 1000:1000 /home/user/.config && \
    chown -R 1000:1000 /home/user/.local && \
    # Clean up package cache to reduce image size:
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create Chromium launcher with CDP flags
RUN printf '#!/bin/bash\necho "Starting Chromium with remote debugging on 0.0.0.0:9222..."\n/usr/bin/chromium --no-sandbox --disable-gpu --disable-dev-shm-usage --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --no-first-run --no-default-browser-check --disable-extensions --disable-default-apps --disable-component-update --password-store=basic --use-mock-keychain --autoplay-policy=no-user-gesture-required --user-data-dir=/home/user/chromium-data --no-zygote --disable-session-crashed-bubble "$@"\necho "Chromium exited with code $?"\n' > /usr/local/bin/chromium && \
    chmod +x /usr/local/bin/chromium

# Create a socat service with supervisor to ensure port forwarding is always running
# RUN mkdir -p /etc/supervisor/conf.d && \
#     echo '[supervisord]\nnodaemon=true\n\n[program:socat]\ncommand=socat TCP4-LISTEN:9223,fork,reuseaddr TCP4:127.0.0.1:9222\nautostart=true\nautorestart=true\nstdout_logfile=/var/log/socat.log\nstdout_logfile_maxbytes=1MB\nstdout_logfile_backups=10\nstderr_logfile=/var/log/socat.err\nstderr_logfile_maxbytes=1MB\nstderr_logfile_backups=10' > /etc/supervisor/conf.d/socat.conf

# Start the socat service at system boot
# RUN echo '#!/bin/bash\n# Start supervisor to manage socat service\n/usr/bin/supervisord -c /etc/supervisor/supervisord.conf &' > /usr/local/bin/start-port-forward.sh && \
#     chmod +x /usr/local/bin/start-port-forward.sh && \
#     echo "[Desktop Entry]\nType=Application\nName=PortForward\nExec=/usr/local/bin/start-port-forward.sh\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true" > /home/user/.config/autostart/port-forward.desktop

# 添加自动启动supervisord的桌面启动项
RUN echo '#!/bin/bash\n# 启动supervisord服务\nsudo /usr/bin/supervisord -c /etc/supervisor/supervisord.conf &' > /usr/local/bin/start-supervisord.sh && \
    chmod +x /usr/local/bin/start-supervisord.sh && \
    echo "[Desktop Entry]\nType=Application\nName=Supervisord\nExec=/usr/local/bin/start-supervisord.sh\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true" > /home/user/.config/autostart/supervisord.desktop && \
    chmod +x /home/user/.config/autostart/supervisord.desktop && \
    chown -R user:user /home/user/.config/autostart

# Install VS Code (optimized single layer)
ARG TARGETARCH
RUN case "$TARGETARCH" in \
        "amd64") VS_ARCH="x64" ;; \
        "arm64") VS_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: $TARGETARCH" && exit 1 ;; \
    esac && \
    wget -O /tmp/vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-${VS_ARCH}" && \
    dpkg -i /tmp/vscode.deb || true && \
    apt-get update && \
    apt-get install -f -y && \
    # Clean up package cache to reduce image size:
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN mkdir -p /home/user/.config/Code/User
COPY ./settings.json /home/user/.config/Code/User/settings.json

# Copy desktop background for XFCE
COPY ./wallpaper.png /usr/share/backgrounds/xfce/wallpaper.png
RUN mkdir -p /home/user/.config/xfce4/xfconf/xfce-perchannel-xml/
COPY ./xfce4-desktop.xml /home/user/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml

# Disable screen saver and power management, configure XFCE panel
RUN mkdir -p /home/user/.config/xfce4/xfconf/xfce-perchannel-xml/ && \
    echo '<?xml version="1.0" encoding="UTF-8"?>\n<channel name="xfce4-screensaver" version="1.0">\n  <property name="saver" type="empty">\n    <property name="enabled" type="bool" value="false"/>\n    <property name="mode" type="int" value="0"/>\n  </property>\n  <property name="lock" type="empty">\n    <property name="enabled" type="bool" value="false"/>\n  </property>\n</channel>' > /home/user/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-screensaver.xml && \
    echo '<?xml version="1.0" encoding="UTF-8"?>\n<channel name="xfce4-power-manager" version="1.0">\n  <property name="xfce4-power-manager" type="empty">\n    <property name="blank-on-ac" type="int" value="0"/>\n    <property name="blank-on-battery" type="int" value="0"/>\n    <property name="dpms-enabled" type="bool" value="false"/>\n    <property name="dpms-on-ac-sleep" type="uint" value="0"/>\n    <property name="dpms-on-ac-off" type="uint" value="0"/>\n    <property name="dpms-on-battery-sleep" type="uint" value="0"/>\n    <property name="dpms-on-battery-off" type="uint" value="0"/>\n  </property>\n</channel>' > /home/user/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-power-manager.xml && \
    # Configure XFCE panel with Chromium launcher in taskbar
    echo '<?xml version="1.0" encoding="UTF-8"?>\n<channel name="xfce4-panel" version="1.0">\n  <property name="configver" type="int" value="2"/>\n  <property name="panels" type="array">\n    <value type="int" value="1"/>\n    <property name="panel-1" type="empty">\n      <property name="position" type="string" value="p=6;x=0;y=0"/>\n      <property name="length" type="uint" value="100"/>\n      <property name="position-locked" type="bool" value="true"/>\n      <property name="size" type="uint" value="30"/>\n      <property name="plugin-ids" type="array">\n        <value type="int" value="1"/>\n        <value type="int" value="2"/>\n        <value type="int" value="3"/>\n        <value type="int" value="4"/>\n        <value type="int" value="5"/>\n        <value type="int" value="6"/>\n        <value type="int" value="7"/>\n      </property>\n    </property>\n  </property>\n  <property name="plugins" type="empty">\n    <property name="plugin-1" type="string" value="applicationsmenu"/>\n    <property name="plugin-2" type="string" value="separator"/>\n    <property name="plugin-3" type="string" value="tasklist"/>\n    <property name="plugin-4" type="string" value="launcher">\n      <property name="items" type="array">\n        <value type="string" value="chromium.desktop"/>\n      </property>\n    </property>\n    <property name="plugin-5" type="string" value="separator"/>\n    <property name="plugin-6" type="string" value="systray"/>\n    <property name="plugin-7" type="string" value="clock"/>\n  </property>\n</channel>' > /home/user/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml && \
    # Override system Chromium desktop entry to use custom launcher
    mkdir -p /home/user/.local/share/applications && \
    echo "[Desktop Entry]\nVersion=1.0\nType=Application\nName=Chromium\nComment=Web Browser with Remote Debugging\nExec=/usr/local/bin/chromium\nIcon=chromium\nTerminal=false\nCategories=Network;WebBrowser;\nMimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;x-scheme-handler/ftp;x-scheme-handler/chrome;video/webm;application/x-xpinstall;\nActions=NewWindow;NewPrivateWindow;" > /home/user/.local/share/applications/chromium.desktop && \
    chmod +x /home/user/.local/share/applications/chromium.desktop && \
    # Set Chromium as default web browser
    echo "[Default Applications]\ntext/html=chromium.desktop\ntext/xml=chromium.desktop\napplication/xhtml+xml=chromium.desktop\napplication/xml=chromium.desktop\napplication/rss+xml=chromium.desktop\napplication/rdf+xml=chromium.desktop\nimage/gif=chromium.desktop\nimage/jpeg=chromium.desktop\nimage/png=chromium.desktop\nx-scheme-handler/http=chromium.desktop\nx-scheme-handler/https=chromium.desktop\nx-scheme-handler/ftp=chromium.desktop\nx-scheme-handler/chrome=chromium.desktop\nvideo/webm=chromium.desktop\napplication/x-xpinstall=chromium.desktop" > /home/user/.config/mimeapps.list && \
    chown -R user:user /home/user/.config /home/user/.local

# Create desktop icons for terminal, VS Code, and Chrome
RUN mkdir -p /home/user/Desktop && \
    # Terminal desktop icon
    echo "[Desktop Entry]\nVersion=1.0\nType=Application\nName=Terminal\nComment=Terminal Emulator\nExec=xfce4-terminal\nIcon=utilities-terminal\nTerminal=false\nCategories=System;TerminalEmulator;" > /home/user/Desktop/terminal.desktop && \
    chmod +x /home/user/Desktop/terminal.desktop && \
    # VS Code desktop icon
    echo "[Desktop Entry]\nVersion=1.0\nType=Application\nName=Visual Studio Code\nComment=Code Editor\nExec=/usr/bin/code --no-sandbox\nIcon=vscode\nTerminal=false\nCategories=Development;IDE;" > /home/user/Desktop/vscode.desktop && \
    chmod +x /home/user/Desktop/vscode.desktop && \
    # Chromium desktop icon
    echo "[Desktop Entry]\nVersion=1.0\nType=Application\nName=Chromium\nComment=Web Browser with Remote Debugging\nExec=/usr/local/bin/chromium\nIcon=chromium\nTerminal=false\nCategories=Network;WebBrowser;" > /home/user/Desktop/chromium.desktop && \
    chmod +x /home/user/Desktop/chromium.desktop && \
    chown -R user:user /home/user/Desktop

# Copy firefox policies
COPY firefox-policies.json /usr/lib/firefox-esr/distribution/policies.json
COPY firefox-autoconfig.js /usr/lib/firefox-esr/defaults/pref/autoconfig.js
COPY firefox.cfg /usr/lib/firefox-esr/firefox.cfg


# Code interpretor environment setup
# 系统依赖和Python 3.12安装 (merged for smaller image size)
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential curl git util-linux jq sudo fonts-noto-cjk \
        systemd ca-certificates chrony r-base software-properties-common \
        libzmq3-dev libzmq5 pkg-config && \
    # 使用 Debian 12 默认的 Python 3.11 (更稳定)
    apt-get install -y python3 python3-dev python3-venv python3-pip && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    # curl -sS https://bootstrap.pypa.io/get-pip.py | python && \
    # Clean up package cache to reduce image size:
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# 安装 Node.js 22.x (optimized single layer)
RUN apt-get update && \
    apt-get install -y curl gnupg ca-certificates && \
    # 添加 NodeSource PPA for Node.js 22.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    # 安装 Node.js (npm 会一同被安装)
    apt-get install -y nodejs && \
    # 更新证书
    update-ca-certificates && \
    # 配置 pnpm
    corepack enable && \
    corepack prepare pnpm@latest --activate && \
    echo "Node.js version: $(node -v)" && \
    echo "npm version: $(npm -v)" && \
    echo "pnpm version: $(pnpm -v)" && \
    # Clean up package cache to reduce image size:
    apt-get autoremove -y && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# 环境变量设置
ENV PIP_DEFAULT_TIMEOUT=100 \
  PIP_DISABLE_PIP_VERSION_CHECK=1 \
  PIP_NO_CACHE_DIR=1 \
  JUPYTER_CONFIG_PATH="/root/.jupyter" \
  IPYTHON_CONFIG_PATH="/root/.ipython" \
  SERVER_PATH="/root/.server" \
  R_VERSION=4.4.2

ENV R_HOME=/opt/R/${R_VERSION} \
    JAVA_HOME=/opt/java/openjdk

# # 创建默认用户
# RUN useradd -ms /bin/bash user && \
#     usermod -aG sudo user && \
#     passwd -d user && \
#     echo "user ALL=(ALL:ALL) NOPASSWD: ALL" >>/etc/sudoers

# 设置目录权限
RUN mkdir -p /home/user && \
    chmod 777 -R /home/user && \
    chmod 777 -R /usr/local

# 安装 Jupyter (with cleanup)
COPY ./requirements.txt requirements.txt
RUN pip install --break-system-packages --upgrade pip && \
    pip install --break-system-packages --no-cache-dir -r requirements.txt && \
    ipython kernel install --name "python3" --user && \
    # Clean up pip cache
    rm -rf /root/.cache

# Javascript Kernel (with cleanup and use system libzmq)
RUN export ZMQ_BUILD_DIR=/usr && \
    export ZMQ_SHARED=1 && \
    export npm_config_zmq_shared=true && \
    npm install -g node-gyp && \
    npm install -g --unsafe-perm ijavascript && \
    ijsinstall --install=global && \
    # Clean up npm cache
    npm cache clean --force

# Deno Kernel (with cleanup)
COPY --from=denoland/deno:bin-2.0.4 /deno /usr/bin/deno
RUN chmod +x /usr/bin/deno && \
    deno jupyter --unstable --install && \
    # Clean up deno cache
    rm -rf /root/.cache/deno
COPY ./deno.json /root/.local/share/jupyter/kernels/deno/kernel.json

# Bash Kernel (with cleanup)
RUN pip install --break-system-packages bash_kernel && \
    python -m bash_kernel.install && \
    # Clean up pip cache
    rm -rf /root/.cache

# R Kernel
# RUN R -e "install.packages('IRkernel', repos='https://cloud.r-project.org'); IRkernel::installspec(user = FALSE, name = 'r', displayname = 'R')"


# 配置 envd 服务
ARG TARGETARCH
RUN mkdir -p /etc/systemd/system/multi-user.target.wants
# 复制所有 envd 二进制文件
COPY ./bin/ /tmp/envd-bin/
# 根据目标架构选择对应的 envd 二进制文件
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        cp /tmp/envd-bin/envd-arm64 /usr/bin/envd; \
    else \
        cp /tmp/envd-bin/envd /usr/bin/envd; \
    fi && \
    chmod +x /usr/bin/envd && \
    rm -rf /tmp/envd-bin
RUN echo '[Unit]\n\
Description=Env Daemon Service\n\
\n\
[Service]\n\
Type=simple\n\
Restart=always\n\
User=root\n\
Group=root\n\
ExecStart=/bin/bash -l -c /usr/bin/envd\n\
\n\
[Install]\n\
WantedBy=multi-user.target' > /etc/systemd/system/envd.service

RUN ln -s /etc/systemd/system/envd.service /etc/systemd/system/multi-user.target.wants/envd.service

# 配置 chrony
RUN mkdir -p /etc/chrony
RUN echo 'makestep 1 -1' > /etc/chrony/chrony.conf

RUN mkdir -p /etc/systemd/system/chrony.service.d
RUN echo '[Service]\n\
ExecStart=\n\
ExecStart=/usr/sbin/chronyd\n\
User=root\n\
Group=root' > /etc/systemd/system/chrony.service.d/override.conf

RUN systemctl enable chrony

# Java 配置 (with cleanup)
COPY --from=eclipse-temurin:11-jdk $JAVA_HOME $JAVA_HOME
RUN rm -f /usr/bin/java && \
    ln -s ${JAVA_HOME}/bin/java /usr/bin/java && \
    wget https://github.com/SpencerPark/IJava/releases/download/v1.3.0/ijava-1.3.0.zip && \
    unzip ijava-1.3.0.zip && \
    python install.py --sys-prefix && \
    # Clean up installation files
    rm -rf ijava-1.3.0.zip install.py java/

# 配置自动登录
RUN mkdir -p /etc/systemd/system/serial-getty@ttyS0.service.d
RUN echo '[Service]\n\
ExecStart=\n\
ExecStart=-/sbin/agetty --noissue --autologin root %I 115200,38400,9600 vt102' \
> /etc/systemd/system/serial-getty@ttyS0.service.d/autologin.conf

# 创建虚拟环境并安装服务器依赖 (with cleanup)
RUN python -m venv $SERVER_PATH/.venv
COPY ./server/requirements.txt $SERVER_PATH
RUN $SERVER_PATH/.venv/bin/pip install --no-cache-dir -r $SERVER_PATH/requirements.txt && \
    # Clean up pip cache in virtual environment
    rm -rf $SERVER_PATH/.venv/pip-cache $SERVER_PATH/.venv/lib/python*/site-packages/pip/_vendor/distlib/*.whl
COPY ./server $SERVER_PATH

# 复制配置文件
COPY matplotlibrc /root/.config/matplotlib/.matplotlibrc
COPY ./start-up.sh $JUPYTER_CONFIG_PATH/
RUN chmod +x $JUPYTER_CONFIG_PATH/start-up.sh
COPY ./jupyter_server_config.py $JUPYTER_CONFIG_PATH/

RUN mkdir -p $IPYTHON_CONFIG_PATH/profile_default
COPY ipython_kernel_config.py $IPYTHON_CONFIG_PATH/profile_default/
RUN mkdir -p $IPYTHON_CONFIG_PATH/profile_default/startup
COPY startup_scripts/* $IPYTHON_CONFIG_PATH/profile_default/startup

ENV DISPLAY=:0

RUN apt-get update && apt-get install -y dbus-x11 && \
    rm -rf /var/lib/apt/lists/*




ENTRYPOINT $JUPYTER_CONFIG_PATH/start-up.sh 

#/bin/bash -l -c "/usr/bin/envd"