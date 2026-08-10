package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/service"
)

type ProjectHandler struct {
	service ProjectService
}

func NewProjectHandler(s ProjectService) *ProjectHandler {
	return &ProjectHandler{service: s}
}

type createProjectRequest struct {
	Name            string `json:"name"`
	CallbackBaseUrl string `json:"callbackBaseUrl"`
}

// Create handles POST /api/projects. Field names and validation mirror
func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Name) < 2 {
		response.Error(w, http.StatusUnprocessableEntity, "name must be at least 2 characters")
		return
	}
	if req.CallbackBaseUrl == "" {
		response.Error(w, http.StatusUnprocessableEntity, "callbackBaseUrl is required")
		return
	}

	project, err := h.service.Create(r.Context(), service.CreateProjectInput{
		Name:            req.Name,
		CallbackBaseUrl: req.CallbackBaseUrl,
	})
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to create project")
		return
	}

	response.JSON(w, http.StatusCreated, project)
}

// List handles GET /api/projects
func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	projects, err := h.service.List(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	if projects == nil {
		projects = make([]repository.Project, 0)
	}
	response.JSON(w, http.StatusOK, projects)
}

// Get handles GET /api/projects/{slug}
func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	project, err := h.service.Get(r.Context(), slug)
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	response.JSON(w, http.StatusOK, project)
}

// Touch handles POST /api/projects/{slug}/touch
func (h *ProjectHandler) Touch(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	if err := h.service.Touch(r.Context(), slug); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to update project activity")
		return
	}
	response.JSON(w, http.StatusNoContent, nil)
}

// RegenerateCredentials handles POST /api/projects/{slug}/credentials/regenerate
func (h *ProjectHandler) RegenerateCredentials(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	project, err := h.service.RegenerateCredentials(r.Context(), slug)
	if err != nil {
		writeServiceError(w, err, "failed to regenerate credentials")
		return
	}
	response.JSON(w, http.StatusOK, project)
}

// Delete handles DELETE /api/projects/{slug}
func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	if err := h.service.Delete(r.Context(), slug); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to delete project")
		return
	}
	response.JSON(w, http.StatusNoContent, nil)
}

// writeServiceError maps sentinel errors from the service layer to HTTP status codes
func writeServiceError(w http.ResponseWriter, err error, fallbackMessage string) {
	switch {
	case errors.Is(err, response.ErrNotFound):
		response.Error(w, http.StatusNotFound, "project not found")
	case errors.Is(err, response.ErrValidation):
		response.Error(w, http.StatusUnprocessableEntity, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, fallbackMessage)
	}
}
