from flask import Blueprint , render_template , request, flash, redirect, url_for
from .models import User
from werkzeug.security import generate_password_hash, check_password_hash
from . import db   ##means from __init__.py import db
from flask_login import login_user, login_required, logout_user, current_user


auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()
        if user:
            if check_password_hash(user.password, password):
                flash('Logged in successfully!', category='success')
                login_user(user, remember=True)
                return redirect(url_for('views.decide'))
            else:
                flash('Incorrect password, try again.', category='error')
        # if the user is not exists in database
        else:
            flash('Email does not exist.', category='error')

    return render_template("login.html", user=current_user)

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('تم تسجيل الخروج بنجاح!', category='success')
    return redirect(url_for('auth.login'))


@auth.route('/signup' ,methods=['GET','POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        first_name = request.form.get('firstName')
        last_name = request.form.get('lastName')
        password1 = request.form.get('password1')
        password2 = request.form.get('password2')
        
        user = User.query.filter_by(email=email).first()
        
        # if he actually a user 
        if user:
            flash('Email already exists.', category='error')
            
        elif len(email) < 4:
            flash('الايميل غير صحيح', category='error')
            
        elif len(first_name) < 2:
            flash('ادخل اسم يتكون من اكثر من حرفين', category='error')
        elif len(last_name) < 2:
            flash('ادخل اسم يتكون من اكثر من حرفين', category='error')
        elif password1 != password2:
             flash('كلمة السر لا تتطابق', category='error')
        elif len(password1) < 7:
           flash('كلمة السر تتكون من سبع مقاطع', category='error')
        else:
           
            new_user = User(email=email, first_name=first_name,last_name=last_name ,password=generate_password_hash(password1, method='pbkdf2:sha256'))
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user, remember=True)
            flash('تم انشاء الحساب بنجاح', category='success')
            return redirect(url_for('views.decide'))
    return render_template("signup.html")