package main

import (
	"encoding/json"
	"fmt"
	"github.com/labstack/echo/v4"
	mw "github.com/labstack/echo/v4/middleware"
	"github.com/teamhanko/hanko/example/middleware"
	"html/template"
	"io"
	"log"
	"net/http"
	"time"
)

type Template struct {
	templates *template.Template
}

func (t *Template) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

type User struct {
	ID                  string    `json:"id"`
	Email               string    `json:"email"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
	Verified            bool      `json:"verified"`
	WebauthnCredentials []struct {
		ID string `json:"id"`
	} `json:"webauthn_credentials"`
}

func main() {
	t := &Template{
		templates: template.Must(template.ParseGlob("public/html/*.html")),
	}

	e := echo.New()
	e.Renderer = t

	e.Use(mw.LoggerWithConfig(mw.LoggerConfig{
		Format: `{"time":"${time_rfc3339_nano}","time_unix":"${time_unix}","id":"${id}","remote_ip":"${remote_ip}",` +
			`"host":"${host}","method":"${method}","uri":"${uri}","user_agent":"${user_agent}",` +
			`"status":${status},"error":"${error}","latency":${latency},"latency_human":"${latency_human}"` +
			`,"bytes_in":${bytes_in},"bytes_out":${bytes_out},"referer":"${referer}"}` + "\n",
	}))

	e.Use(middleware.CacheControlMiddleware())

	e.Static("/static", "public/assets")
	e.File("/", "public/html/index.html")
	e.File("/secured", "public/html/secured.html", middleware.SessionMiddleware())
	e.File("/unauthorized", "public/html/unauthorized.html")

	e.GET("/logout", func(c echo.Context) error {
		cookie := &http.Cookie{
			Name:     "hanko",
			Value:    "",
			MaxAge:   -1,
			HttpOnly: true,
		}
		c.SetCookie(cookie)
		return c.Redirect(http.StatusTemporaryRedirect, "/")
	})

	if err := e.Start(":8080"); err != nil {
		log.Fatal(err)
	}
}
