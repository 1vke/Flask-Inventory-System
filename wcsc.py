from flask import Flask, render_template, request, redirect, session, make_response, jsonify, url_for, send_file, Response, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required 
from datetime import timedelta,timezone, datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from flask_migrate import Migrate, migrate
from barcode import Code128
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import numpy as np
import io, base64, os, random, cv2, pdfkit, PyPDF2, openai, secrets, requests
from dotenv import load_dotenv
from PyPDF2 import PdfReader, PdfWriter
from werkzeug.security import check_password_hash, generate_password_hash
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("S_KEY")
openai.api_key = os.getenv("AI_KEY")
fbWebhook = os.getenv("FB_WEBHOOK")
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=365)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_BINDS'] = {
    'users': 'sqlite:///users.db'
}


db = SQLAlchemy(app)
login_manager = LoginManager(app)

migrate = Migrate(app, db)
openFBsocks = []

class Profile(db.Model):
    tag = db.Column(db.String(20), unique=True,primary_key=True, nullable=False)
    school = db.Column(db.String(20), unique=False, nullable=False)
    location = db.Column(db.String(20), unique=False, nullable=False)
    room = db.Column(db.String(20), unique=False, nullable=False)
    item = db.Column(db.String(20), unique=False, nullable=False)
    model = db.Column(db.String(100), unique=False)
    comments = db.Column(db.String(2000), unique=False)
    lad = db.Column(db.String(40), unique=False)
    dinst = db.Column(db.String(40), unique=False)

    def __repr__(self):
        return [self.tag,self.school,self.location,self.room,self.item]
    
class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
    
@app.before_request
def check_session_expiry():
    try:
        if current_user.is_authenticated:
            min = 10
            if 'expiry' in session:
                expiry = datetime.strptime(session['expiry'], '%Y-%m-%d %H:%M:%S')
                if expiry < datetime.utcnow():
                    session.pop('expiry', None)
                    return redirect(url_for('logout'))
                else:
                    expiry = datetime.utcnow() + timedelta(minutes=min)
                    session['expiry'] = expiry.strftime('%Y-%m-%d %H:%M:%S')
            else:
                expiry = datetime.utcnow() + timedelta(minutes=min)
                session['expiry'] = expiry.strftime('%Y-%m-%d %H:%M:%S')
    except:
        pass

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Get the current time in Newburgh's timezone.
def curTime(fmt='%m/%d/%Y'):
    return datetime.now().astimezone(timezone(timedelta(hours=-5), 'US/Eastern')).strftime(fmt)

def getMetadata():
    metadata = {}
    directory_path = os.path.join(os.path.dirname(__file__), 'metadata') ## UBU
    for filename in os.listdir(directory_path):
        if filename.endswith(".txt"):
            with open(os.path.join(directory_path, filename), "r") as f:
                lines = f.readlines()
                for i in range(filename.count("^")+1):
                    metaName = filename.replace(".txt","").split("^")[i]
                    metaDict = {}
                    incData = lines[0].split("^")[i].split(",")
                    increment, indNum = int(incData[0]), int(incData[1])
                    lineDat = lines[1:]
                    for l in range(len(lineDat)):
                        metaDict[indNum] = lineDat[l].strip().split("^")[i]
                        indNum += increment
                    metadata[metaName] = metaDict
    return metadata

def addUser(username,password):
    db.session.bind = "users"
    db.session.add(User(username=username,password=generate_password_hash(password)))
    db.session.commit()
    db.session.bind = None

def read_image_from_data_url(data_url):
    # Extract the encoded image data from the data URL
    encoded_data = data_url.split(',')[1]
    
    # Decode the image data from base64
    decoded_data = base64.b64decode(encoded_data)
    
    # Load the image data into a NumPy array
    image_data = np.frombuffer(decoded_data, dtype=np.uint8)
    
    # Decode the image using cv2.imdecode
    image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
    return image

def tagRegen(tag):
    while True:
        if dbExists(tag):
            lst = list(tag)
            random.shuffle(lst[:3])
            tag = ''.join(lst)
        else:
            break
    return tag
    
def autoLog(tags):
    try:
        for i, tagItem in enumerate(tags):
            tag = tagItem.split("$")[0]
            date = tagItem.split("$")[1]
            model = tagItem.split("$")[2]
            if dbExists(tag):
                tag = tagRegen(tag)
            if len(tag) != 7:
                return logResp(f"danger^2500^Tag isn't 7 characters. '{tag}' <- {len(tag)} chars.",tag)
            if not tag.isalpha():
                return logResp(f"danger^2500^Tag contains non-alphabetical characters. '{tag}'",tag)
            dbAdd(tag,date,model)
        return logResp(f"success^2500^Successfully added all tags","")
    except Exception as e:
        return logResp(f"danger^4000^Python Exception! Tag: {tag}\n{e}",tag)
    
@app.route('/',methods=['GET','POST'])
@login_required
def index():
    if request.method == 'POST':
        try:
            data = request.get_json()

            tag = str(data["info"]).lower()
            date = str(data["date"])
            model = str(data["model"])
            try:
                if dbExists(tag):
                    return 'redir'
                else:
                    if len(tag) != 7:
                        return logResp(f"danger^2500^Tag isn't 7 characters. '{tag}' <- {len(tag)} chars.",tag)
                    if not tag.isalpha():
                        return logResp(f"danger^2500^Tag contains non-alphabetical characters. '{tag}'",tag)
                    response = make_response(dbAdd(tag,date,model))
                    response.set_cookie('history', addHistory(request,tag))
                    return response
            except Exception as e:
                print(e)
                return logResp(f"danger^4000^Python Exception! Tag: {tag}\n{e}",tag)
        except Exception as e:
            print(e)
            return logResp(f"danger^4000^Python Exception! Tag: {tag}\n{e}",tag)
    else:
        user_agent = request.headers.get('User-Agent')
        if 'Mobile' in user_agent:
            return render_template('mobileScanner.html')
        else:
            return render_template('index.html')

def dbExists(tag):
    obj = Profile.query.get(tag)
    if obj is not None:
        return True
    return False

def addHistory(rq,tag):
    history_cookie = rq.cookies.get('history')
    history = str(history_cookie)    
    if not history_cookie:
        history = ""
    if history != "":
        history += "^"
    history += tag
    if len(history.split("^")) > 15:
        history = "^".join(history.split("^")[1:])
    return history

def delHistory(rq,tag):
    history_cookie = str(rq.cookies.get('history'))
    if tag in history_cookie:
        history = history_cookie.split("^")
        history.remove(tag)
        return "^".join(history)
    return history_cookie
    
def dbAdd(tag,date,model):
    try:
        metadata = getMetadata()
        try:
            print(date)
            p = Profile(tag=tag, school=metadata["schools"][from_hex(tag[3:4])], location=from_hex(tag[4:6]), room="", item=metadata["items"][from_hex(tag[6:])], comments="", lad="Never", dinst="Unset")
            if from_hex(tag[4:6]) in metadata["locations"]:
                p.location = metadata["locations"][from_hex(tag[4:6])]
            if len(date)>1:
                dS = date.split("-")
                p.dinst = f"{dS[1]}/{dS[2]}/{dS[0]}"
            if len(model)>1:
                p.model = model
        except Exception as e:
            print(e)
            return logResp(f"danger^1500^Python Exception! Tag might formated incorrectly.",e)  
        db.session.add(p)
        db.session.commit()
        return logResp(f"success^1500^'{tag}' should be added!",tag)
    except Exception as e:
        print(e)
        return logResp(f"danger^1500^Python Exception! {e}",tag) 

    
def to_hex(n):
    result = ''
    while n > 0:
        n -= 1
        remainder = n % 26
        result = chr(remainder + 97) + result
        n //= 26
    return result

def from_hex(s):
    result = 0
    for c in s:
        result *= 26
        result += ord(c) - 96
    return result
   
@app.route('/del', methods=['POST'])
@login_required
def dbDel():
    rq = request.get_json()
    tag = rq["ItemTag"]
    if dbExists(tag):
        data = Profile.query.get(tag)
        db.session.delete(data)
        db.session.commit()
    response = logResp(f'success^1000^Successfully deleted tag: {tag}',"")
    response.set_cookie('history', delHistory(request,tag))
    return response

@app.route('/edit', methods=['POST'])
@login_required
def dbEdit():
    try:
        metadata = getMetadata()
        rq = request.get_json()
        tag = rq["ItemTag"].split('^')
        data = Profile.query.get(tag[0])
        setattr(data, tag[1], tag[2])
        setattr(data,"lad",curTime("%m/%d/%Y %I:%M %p"))
        db.session.commit()
        if tag[1] == "tag" and (len(tag[2]) != 7 or not tag[2].isalpha()):
            return logResp(f'info^2500^Successfully edited! Keep in mind to stick to proper formating rules for tags.',"")
        if tag[1]+"s" in metadata and tag[2] not in metadata[tag[1]+"s"].values():
            return logResp(f'info^2500^Successfully edited. However, item does not match anything stored in metadata.',"")
        return logResp(f'success^1000^Successfully edited!',"")
    except Exception as e:
        return logResp(f'danger^1000^Python Exception! {e}',"")
    
def logResp(alert,dispData):
    limit = 40
    response = make_response(alert)
    dateHead = curTime("%m/%d/%Y %I:%M %p")
    msg = f"|{dateHead.center(36,'-')}@{alert.split('^')[2]}@@"
    if request.cookies.get('log'):
        peLog = request.cookies.get('log')
        if len(peLog.split("|")) > limit:
            peLog = "|".join(peLog.split("|")[:limit])
        response.set_cookie('log', msg + peLog)
    else:
        response.set_cookie('log', msg)

    return response

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        try:
            db.session.bind = 'users'
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password, password):
                login_user(user)
                db.session.bind = None
                return redirect('/')
            return render_template('login.html', error='Invalid username or password. Please try again.')
        except Exception as e:
            return render_template('login.html', error=f'{e}')
    else:
        return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login')

@app.route('/DATABASERESETDATABASERESET')
def dbr():
    db.create_all()
    db.session.bind = "users"
    db.create_all()
    db.session.bind = None
    return f"reset"

@app.route('/settings',methods=['POST','GET'])
@login_required
def settings():
    return render_template('settings.html')

def getDictStr(dict,subdict):
    return '^'.join([f"{k}:{v}" for k, v in dict[subdict].items()])

@app.route('/barcodeGenerator',methods=['POST','GET'])
@login_required
def barcodeGenerator():
    if request.method == 'POST':
        data = request.get_json()

        if data['autoLog'] == "true":
            return autoLog(data["tags"])
        try:
            sheet = labelSheet(data["tags"])
            response = Response(sheet, mimetype='application/pdf')
            response.headers['Content-Disposition'] = 'attachment; filename=sadas.pdf'
            return response
        except Exception as e:
            return e
    else:
        metadata = getMetadata()
        schools = getDictStr(metadata,"schools")
        ipOct = getDictStr(metadata,"ipOct")
        items = getDictStr(metadata,"items")
        locations = getDictStr(metadata,"locations")
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        return render_template('barcodeGenerator.html', schools=schools, ipOct=ipOct, items=items, locations=locations, ip = client_ip )

def getTmp(p):
    return f"""
        <tr>
            <td>{p.tag}</td>
            <td>{p.school}</td>
            <td>{p.location}</td>
            <td>{p.item}</td>
            <td>{p.model}</td>
            <td>{p.dinst}</td>
        </tr>
    """
def getAstRow(key,items):
    return f'{key}: <span style="font-weight: bold;">{len([ast for ast in items if ast.item == key])}</span>'

def repHtml(items,filt):
    pdf_config = pdfkit.configuration(wkhtmltopdf='/usr/bin/wkhtmltopdf')
    #repBase = open("templates/.txt", "r").read()
    repTabTop = open("templates/repTabTop.txt", "r").read()
    repTabBot = open("templates/repTabBot.txt", "r").read()
    
    metadata = getMetadata()
    keys = getDictStr(metadata,"items").split("^")

    #completion = openai.ChatCompletion.create(
    #    model="gpt-3.5-turbo",
    #    messages=[
    #        {"role": "user", "content": f"Here is a python list that is a filter:{str(filt)}. The items seperated by commas are individual filters, and those filters are delimited by the char ^. You can see how it says a noun or something then a semicolon, if this filter was used on a database of assets, I want you to decribe what would be in the report."}
    #    ]
    #)

    totAst = "<br>".join([ getAstRow(key.split(":")[1],items) for key in keys])
    repBase = open("templates/repBase.txt", "r").read().replace("TOT",str(len(items))).replace("FILT",str(filt)).replace("CURRENTUSER",current_user.username).replace("CURRENTDATE",curTime()).replace("ASSETPERITEM",totAst)#.replace("AICONT",completion.choices[0].message.content)
    pdfPages = []
    curHtml = ""
    count = 0
    pn = 1
    limit = 27

    pdfPages.append(pdfkit.from_string(repBase, False, configuration=pdf_config))
    for asset in items:
        if count == 0:
            curHtml += repTabTop
        curHtml += getTmp(asset)
        count+=1
        if count == limit:
            curHtml += repTabBot.replace("PAGENUM",str(pn))
            pn+=1
            pdfPages.append(pdfkit.from_string(curHtml, False, configuration=pdf_config))
            curHtml = ""
            count = 0
    if count!=0:
        curHtml += repTabBot.replace("PAGENUM",str(pn))
        pn+=1
        pdfPages.append(pdfkit.from_string(curHtml, False, configuration=pdf_config))

    return pdfPages
    

def genRepPdf(items,filt):
    pdf_bytes = io.BytesIO()

    pdfpages = repHtml(items,filt)

    # Merge PDFs into a single file
    output_pdf = PyPDF2.PdfMerger()
    for page in pdfpages:
        output_pdf.append(PyPDF2.PdfReader(io.BytesIO(page)))
    
    output_pdf.write(pdf_bytes)
    pdf_bytes.seek(0)
    return pdf_bytes

       
        
@app.route('/reportGenerator',methods=['POST','GET'])
@login_required
def reportGenerator():
    if request.method == 'POST':
        data = request.get_json()

        results = []
        filtDat = data["filt"]
        filtDat = filtDat.split("|")

        try:
            for filt in filtDat:
                query = Profile.query
                for infilt in filt.split("^"):
                    if infilt not in ["Oldest", "Newest"]:
                        column_attr = getattr(Profile, infilt.split(":")[0])
                        if infilt.split(":")[0] in ["model", "comments", "location"]:
                            query = query.filter(column_attr.ilike(f'%{infilt.split(":")[1]}%'))
                        else:
                            query = query.filter(column_attr == infilt.split(":")[1])
                profiles = query.all()
                if "Oldest" in filt:
                    profiles = sorted(profiles, key=lambda x: int(x.dinst.split("/")[-1]) if x.dinst.split("/")[-1].isdigit() else float('inf'))
                elif "Newest" in filt:
                    profiles = sorted(profiles, key=lambda x: int(x.dinst.split("/")[-1]) if x.dinst.split("/")[-1].isdigit() else float('-inf'), reverse=True)
                results.extend(profiles)

        except AttributeError:
            results = Profile.query.all()

        
        pdf = genRepPdf(results, filtDat)
        response = Response(pdf, mimetype='application/pdf')
        response.headers['Content-Disposition'] = 'attachment; filename=sadas.pdf'
        return response

        #return jsonify(profile_dicts)
    else:
        metadata = getMetadata()
        schools = getDictStr(metadata,"schools")
        items = getDictStr(metadata,"items")
        locations = getDictStr(metadata,"locations")
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        colnames = "school^location^item^model^comments^Oldest^Newest"
        return render_template('reportGenerator.html', schools=schools, items=items, locations=locations, ip = client_ip, colnames = colnames)


@app.route('/genBar',methods=['POST'])
@login_required
def genBar():
    data = request.get_json()
    tag = data['bar']

    response = Response(getBarcode(False,tag), mimetype='image/png')
    response.headers['Content-Disposition'] = 'attachment; filename=bar.png'
    return response

def getBarcode(crop, tag, crop_ratio=0.4500):
    barcode_class = Code128(tag, writer=ImageWriter())
    binary_stream = io.BytesIO()
    barcode_class.write(binary_stream)
    binary_stream.seek(0)

    # Crops the barcode image, if crop is true
    # Method used by the itemTemplate page and
    # the label generation process
    if crop:
        barcode_image = Image.open(binary_stream)
        
        width, height = barcode_image.size
        crop_height = int(height * crop_ratio)
        crop_top = crop_height
        crop_bottom = height - crop_height
        
        cropped_image = barcode_image.crop((20, crop_top, width-20, crop_bottom))

        cropped_stream = io.BytesIO()
        cropped_image.save(cropped_stream, format="PNG")
        cropped_stream.seek(0)
        
        return cropped_stream
    
    return binary_stream

def blankSheet():
    # Returns a blank image for labels.
    return Image.open(os.path.join(os.path.dirname(__file__), "resources/avery.jpg"))

def addPage(output,img):
    # Get a blank PDF
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.save()

    # Add the blank page to the PDF
    packet.seek(0)
    new_pdf = PdfReader(packet)
    output.addPage(new_pdf.get_page(0))

    # Draw the image on the page
    page = output.pages[output.getNumPages()-1]
    page.merge_page(img.convert('RGB'), expand=True)
    return output

def cfImage(image):
    width_percent = 0.92   # Crop 50% of the width
    height_percent = 0.92  # Crop 50% of the height

    # Calculate the crop box coordinates
    width, height = image.size
    left = int((width - width * width_percent) / 2)
    top = int((height - height * height_percent) / 2)
    right = int((width + width * width_percent) / 2)
    bottom = int((height + height * height_percent) / 2)

    # Crop the image
    cropped_im = image.crop((left, top, right, bottom))
    imageByts = io.BytesIO()
    cropped_im.save(imageByts, format="PDF", dpi=(276,276), resolution_unit='inch')
    imageByts.seek(0)
    return imageByts

def labelSheet(tags):
    tags = tags.split("^")
    sheets = []
    sheet = blankSheet()
    k, z, c = 0, 0, 0

    for i, item in enumerate(tags):
        tag = item
        if request.get_json()["autoLog"] != "True":
            tag = tagRegen(item)

        rePrefBarcode = Image.open(getBarcode(True,tag))
        prefBarcode = rePrefBarcode.resize((int(rePrefBarcode.width*1.75), int(rePrefBarcode.height*1.75)))
        w, h = prefBarcode.size

        barcode = Image.new('RGB', (w, h + 30), (255, 255, 255))
        barcode.paste(prefBarcode, (0, 0))
        draw = ImageDraw.Draw(barcode)
        font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), 'resources/FiraCode-Regular.ttf'), 30)

        text = tag
        text_width, text_height = draw.textsize(text, font)
        text_x = (w - text_width) // 2
        text_y = h + (30 - text_height) // 2
        draw.text((text_x, text_y), text, font=font, fill=(0, 0, 0))
 
        curBoxX = 90*(k+1)+500*(k+1)
        curImageX = 90*(k+1)+w+500*k
        lrMargin = int((curBoxX-curImageX)/2)
        pointerX,pointerY = lrMargin+(90*(k+1))+k*500, 142+(75-int(h/2))+z*142

        sheet.paste(barcode, (pointerX, pointerY))

        if tags.index(tag) != len(tags)-1 and tags[tags.index(tag)+1][-4:] != tag[-4:]:
            itemSep = Image.open("resources/itemSep.jpg")
            sheet.paste(itemSep, (w+pointerX, h+5+pointerY))
    
        k, c = k+1, c+1
        if k == 4:
            z, k = z+1, 0
        if c == 80:
            c, z = 0, 0
            sheets.append(cfImage(sheet))
            sheet = blankSheet()

    if c!=0:
        sheets.append(cfImage(sheet))
    
    output = PdfWriter()

    for sheet in sheets:
        input = PdfReader(sheet)
        output.add_page(input.pages[0])

    pdf_bytes = io.BytesIO()
    output.write(pdf_bytes)
    pdf_bytes.seek(0)
    return pdf_bytes

@app.route('/setHist', methods=['POST'])
@login_required
def setcookie():
    data = request.get_json()
    hist = data['hist']
    resp = jsonify({'success': ''})
    resp.set_cookie('hist', hist)
    return resp

@app.route('/datavis/<page>',methods=['POST','GET'])
@login_required
def datavis(page):
    try:
        assets = Profile.query.all()
        headers = ['Tag', 'School', 'Location', 'Item']
        rows = [[i.tag, i.school, i.location, i.item] for i in assets[(24*(int(page)-1)):(24*(int(page)))]]
        if len(rows) == 0:
            if "/datavis" not in str(request.referrer) and str(request.referrer)!="None" and page!="1":
                return redirect("/datavis/1")
            elif page=="1":
                return render_template('datavis.html', headers=headers, rows=rows, page=page)
            return Response('', status=204)
        return render_template('datavis.html', headers=headers, rows=rows, page=page)
    except Exception as e:
        #print(f"ERROR WHILST HANDLING PAGES:\n{e}")
        return redirect("/datavis/1")

@app.route('/item/<tag>')
@login_required
def itemTemplate(tag):
    tag = tag.lower()
    data = Profile.query.get(tag)
    if data is None:
        return render_template('404.html', errMsg="Tag not found!"), 404
    return render_template('itemTemplate.html',tag=tag, school=data.school, location=data.location, item=data.item, model=data.model, comments=data.comments, lad=data.lad, dinst=data.dinst)

def postFeedback(data):
    WEBHOOK_URL = fbWebhook
    payload = {
        "content": f"DATE: {curTime('%m/%d/%Y %I:%M %p')}\nUSER: {current_user.username}  \nEMAIL: {data['email']}\n\n```Title: {data['ttl']}\n\n{data['msg']}```"
    }
    requests.post(WEBHOOK_URL, json=payload)

@app.route('/feedback',methods=['POST','GET'])
@login_required
def feedback():
    if request.method == "POST":
        data = request.get_json()
        try:
            postFeedback(data)
            return f"success^2000^Feedback sent!"
        except Exception as e:
            return f"danger^2000^{e}"
    return render_template("feedback.html")

@app.route('/dM',methods=['POST'])
def dM():
    dat = request.get_json()
    dd = dat['message']
    return dd

@app.route('/admin',methods=['POST','GET'])
def adminLog():
    if request.method == "POST":
        usrkey = request.get_json()['key']
        if usrkey == os.getenv("A_KEY"):
            tk = secrets.token_urlsafe(120)
            et = datetime.now() + timedelta(minutes=5)
            session['tk'] = tk
            session['et'] = et
            return f"redir^/su/{tk}"
        return f"danger^2000^INVALID KEY"
    else:
        return render_template('adminR.html')
    
@app.route('/su/<tk>',methods=['POST','GET'])
def adminPage(tk):
    if request.method == "POST":
        data = request.get_json()
        S_et = session.get('et').replace(tzinfo=None)
        if not S_et or datetime.now() > S_et:
            session.pop('et', None)
            return "danger^4000^session invalid, relog!"
        else:
            session["et"] = datetime.now() + timedelta(minutes=5)
        
        if data["mth"] == "addUsr":
            try:
                addUser(data["un"],data["pw"])
                return f"success^2500^User added successfully"
            except Exception as e:
                return f"danger^2500^Failure to add user: {e}"
            
        if data["mth"] == "delUsr":
            try:
                user = User.query.filter_by(username=data["un"]).first()
                db.session.bind = "users"
                db.session.delete(user)
                db.session.commit()
                db.session.bind = None
                return f"success^2500^User deleted successfully"
            except Exception as e:
                return f"danger^2500^Failure to add user: {e}"

    else:
        S_tk = session.get('tk')
        if not tk or tk != S_tk:
            return redirect("/admin")
        session.pop('tk', None)

        users = User.query.all()
        headers = ['Username']
        rows = [[i.username] for i in users]
        return render_template("adminP.html", headers=headers, rows=rows)


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html', errMsg=e), 404

@app.errorhandler(401)
def unauth(e):
    if request.method == "GET":
        return redirect('/login')