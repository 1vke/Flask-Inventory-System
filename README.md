<img width="1000" align="center" src="https://github.com/1vke/Flask-Inventory-System/blob/main/gitStatic/screenys.png">

<p align="center">
  <h1 align="center">Flask Inventory System</h1>

  <p align="center">
    Python Flask app to manage assets. Log assets, print barcodes for them, and effectively manage them.<br>
    Written in Python, Javascript, HTML and CSS<br>
    · Discord: lvke#1655 ·
  </p>
</p>

# NOTICE!
This web application is in BETA! Some features might be absent or buggy<br>
README is under construction!

# Overview
This application is designed to help manage inventory by providing a user-friendly interface to scan and manage assets. It consists of three main pages:

- Scanner: The scanner page allows you to scan existing items and navigate to their respective page, or add new items to the inventory. 

- Asset Viewer: The asset viewer page is where you can view all the assets in your inventory. From here, you can navigate to individual asset pages (by double clicking their tag), delete or edit assets, and get a comprehensive overview of your inventory.

- Barcode Generator: The barcode generator page allows you to create barcode stickers for your assets. You can specify the necessary instructions and generate a PDF with barcodes that can be printed onto sticker sheets and applied to your assets for easy scanning in the future.

In addition to the three main pages, the application also features a "Report" page, located inside of the "Asset Viewer" page (report button). This page allows users to filter through their inventory and generate a detailed PDF report of their assets. 

# Stack
This application has been tested and works on a Python 3.10 stack with WSGI, Gunicorn, and Nginx on an Ubuntu server.

# Installation
To get this application up and running, it is recommended you follow this DigitalOcean article:<br>
https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-gunicorn-and-nginx-on-ubuntu-22-04<br><br>
You should clone the github into the website folder that contains the python virtual environment as well as the "wsgi.py".<br><br>
The only things that you will have to not follow or change from the article is that the "myproject.py" is already in this project (named app.py) and in the "wsgi.py" the import statement should be from app import app.
