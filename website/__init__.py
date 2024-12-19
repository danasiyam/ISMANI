from os import path
from flask import Flask
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy

# define the database for the app using SQLAlechemy database
db = SQLAlchemy()
DB_NAME = "database.db"

# define flask application
def create_app():
    app = Flask(__name__)
    # this is a secret key to encrypt data and cookies stuff
    app.config['SECRET_KEY']= 'hhhhhasdyn kkhihpoiuniii'
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_NAME}'
    db.init_app(app)
    
    # importing the blueprints we defined in main
    from .views import views
    from .auth import auth
    
    # now register the defined blueprints
    app.register_blueprint(views,url_prefix ='/')
    app.register_blueprint(auth,url_prefix ='/')
    
    
    from .models import User
    
    with app.app_context():
        db.create_all()

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(id):
        return User.query.get(int(id))

    return app

def create_database(app):
    with app.app_context():
        try:
            if not path.exists('website/' + DB_NAME):
                db.create_all()  # Create the database schema
                print('Created Database!')
        except Exception as e:
            print(f"Failed to create database: {e}")
