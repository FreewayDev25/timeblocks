from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    hours = list(range(24))
    return render_template("index.html", days=days, hours=hours)


if __name__ == "__main__":
    app.run(debug=True)